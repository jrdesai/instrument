//! Recursive-descent parser and evaluator for numeric expressions.
//!
//! Grammar (lowest to highest precedence):
//!
//! ```text
//! expr    := term (('+' | '-') term)*
//! term    := unary (('*' | '/' | '%') unary)*
//! unary   := ('+' | '-') unary | power
//! power   := primary ('^' unary)?          // right-associative: 2^3^2 = 2^9
//! primary := number | '(' expr ')' | ident | ident '(' args ')'
//! ```
//!
//! `^` binds tighter than unary minus, so `-2^2` is `-4` and `2^-1` is `0.5`.

use std::f64::consts;
use thiserror::Error;

/// Nesting limit; deeply nested input would otherwise overflow the stack (fatal in WASM).
const MAX_DEPTH: usize = 256;

#[derive(Debug, Error, PartialEq)]
pub enum EvalError {
    #[error("Unexpected end of expression")]
    UnexpectedEnd,
    #[error("Unexpected '{0}' at position {1}")]
    UnexpectedChar(char, usize),
    #[error("Invalid number '{0}'")]
    InvalidNumber(String),
    #[error("Missing closing parenthesis")]
    UnclosedParen,
    #[error("Unknown variable '{0}'")]
    UnknownVariable(String),
    #[error("Unknown function '{0}'")]
    UnknownFunction(String),
    #[error("Function '{name}' expects {expected} argument(s), got {got}")]
    WrongArgCount {
        name: String,
        expected: &'static str,
        got: usize,
    },
    #[error("Expression is nested too deeply")]
    TooDeep,
}

/// Parses and evaluates `input`. Identifiers are case-sensitive; callers lowercase first.
pub fn evaluate(input: &str) -> Result<f64, EvalError> {
    let mut parser = Parser {
        chars: input.chars().collect(),
        pos: 0,
        depth: 0,
    };
    let value = parser.expr()?;
    parser.skip_ws();
    match parser.peek() {
        Some(c) => Err(EvalError::UnexpectedChar(c, parser.pos)),
        None => Ok(value),
    }
}

struct Parser {
    chars: Vec<char>,
    pos: usize,
    depth: usize,
}

impl Parser {
    fn peek(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }

    fn skip_ws(&mut self) {
        while matches!(self.peek(), Some(c) if c.is_whitespace()) {
            self.pos += 1;
        }
    }

    fn eat(&mut self, c: char) -> bool {
        self.skip_ws();
        if self.peek() == Some(c) {
            self.pos += 1;
            true
        } else {
            false
        }
    }

    fn expr(&mut self) -> Result<f64, EvalError> {
        let mut acc = self.term()?;
        loop {
            if self.eat('+') {
                acc += self.term()?;
            } else if self.eat('-') {
                acc -= self.term()?;
            } else {
                return Ok(acc);
            }
        }
    }

    fn term(&mut self) -> Result<f64, EvalError> {
        let mut acc = self.unary()?;
        loop {
            if self.eat('*') {
                acc *= self.unary()?;
            } else if self.eat('/') {
                acc /= self.unary()?;
            } else if self.eat('%') {
                acc %= self.unary()?;
            } else {
                return Ok(acc);
            }
        }
    }

    /// Every level of nesting (parentheses, chained signs) passes through here,
    /// so this is the one place the depth limit needs enforcing.
    fn unary(&mut self) -> Result<f64, EvalError> {
        self.depth += 1;
        if self.depth > MAX_DEPTH {
            return Err(EvalError::TooDeep);
        }
        let result = if self.eat('-') {
            self.unary().map(|v| -v)
        } else if self.eat('+') {
            self.unary()
        } else {
            self.power()
        };
        self.depth -= 1;
        result
    }

    fn power(&mut self) -> Result<f64, EvalError> {
        let base = self.primary()?;
        if self.eat('^') {
            let exponent = self.unary()?;
            Ok(base.powf(exponent))
        } else {
            Ok(base)
        }
    }

    fn primary(&mut self) -> Result<f64, EvalError> {
        self.skip_ws();
        match self.peek() {
            None => Err(EvalError::UnexpectedEnd),
            Some('(') => {
                self.pos += 1;
                let value = self.expr()?;
                if self.eat(')') {
                    Ok(value)
                } else {
                    Err(EvalError::UnclosedParen)
                }
            }
            Some(c) if c.is_ascii_digit() || c == '.' => self.number(),
            Some(c) if c.is_alphabetic() || c == '_' => {
                let name = self.ident();
                if self.eat('(') {
                    let args = self.args()?;
                    call(&name, &args)
                } else {
                    constant(&name)
                }
            }
            Some(c) => Err(EvalError::UnexpectedChar(c, self.pos)),
        }
    }

    fn number(&mut self) -> Result<f64, EvalError> {
        let start = self.pos;
        self.take_digits();
        if self.peek() == Some('.') {
            self.pos += 1;
            self.take_digits();
        }
        // Exponent only when digits follow, so `2e` stays a parse error rather than
        // silently reading the constant `e`.
        if matches!(self.peek(), Some('e' | 'E')) {
            let save = self.pos;
            self.pos += 1;
            if matches!(self.peek(), Some('+' | '-')) {
                self.pos += 1;
            }
            if matches!(self.peek(), Some(c) if c.is_ascii_digit()) {
                self.take_digits();
            } else {
                self.pos = save;
            }
        }
        let text: String = self.chars[start..self.pos].iter().collect();
        text.parse::<f64>()
            .map_err(|_| EvalError::InvalidNumber(text))
    }

    fn take_digits(&mut self) {
        while matches!(self.peek(), Some(c) if c.is_ascii_digit()) {
            self.pos += 1;
        }
    }

    fn ident(&mut self) -> String {
        let start = self.pos;
        while matches!(self.peek(), Some(c) if c.is_alphanumeric() || c == '_') {
            self.pos += 1;
        }
        self.chars[start..self.pos].iter().collect()
    }

    /// Parses a comma-separated argument list; the opening `(` is already consumed.
    fn args(&mut self) -> Result<Vec<f64>, EvalError> {
        let mut args = Vec::new();
        if self.eat(')') {
            return Ok(args);
        }
        loop {
            args.push(self.expr()?);
            if self.eat(',') {
                continue;
            }
            if self.eat(')') {
                return Ok(args);
            }
            self.skip_ws();
            return match self.peek() {
                None => Err(EvalError::UnclosedParen),
                Some(c) => Err(EvalError::UnexpectedChar(c, self.pos)),
            };
        }
    }
}

fn constant(name: &str) -> Result<f64, EvalError> {
    match name {
        "pi" => Ok(consts::PI),
        "e" => Ok(consts::E),
        _ => Err(EvalError::UnknownVariable(name.to_string())),
    }
}

fn call(name: &str, args: &[f64]) -> Result<f64, EvalError> {
    let arity = |expected: &'static str| EvalError::WrongArgCount {
        name: name.to_string(),
        expected,
        got: args.len(),
    };
    let unary = |f: fn(f64) -> f64| match args {
        [x] => Ok(f(*x)),
        _ => Err(arity("1")),
    };

    match name {
        "sqrt" => unary(f64::sqrt),
        "exp" => unary(f64::exp),
        "ln" => unary(f64::ln),
        "abs" => unary(f64::abs),
        "sin" => unary(f64::sin),
        "cos" => unary(f64::cos),
        "tan" => unary(f64::tan),
        "asin" => unary(f64::asin),
        "acos" => unary(f64::acos),
        "atan" => unary(f64::atan),
        "sinh" => unary(f64::sinh),
        "cosh" => unary(f64::cosh),
        "tanh" => unary(f64::tanh),
        "asinh" => unary(f64::asinh),
        "acosh" => unary(f64::acosh),
        "atanh" => unary(f64::atanh),
        "floor" => unary(f64::floor),
        "ceil" => unary(f64::ceil),
        "round" => unary(f64::round),
        "signum" => unary(f64::signum),
        "atan2" => match args {
            [y, x] => Ok(y.atan2(*x)),
            _ => Err(arity("2")),
        },
        "min" | "max" => {
            let pick = if name == "min" { f64::min } else { f64::max };
            args.iter()
                .copied()
                .reduce(pick)
                .ok_or_else(|| arity("at least 1"))
        }
        _ => Err(EvalError::UnknownFunction(name.to_string())),
    }
}
