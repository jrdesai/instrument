//! Expression evaluator module backed by the `meval` crate.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ExprEvalInput {
    /// The mathematical expression to evaluate (e.g. "sqrt(2) + 3^2").
    pub expression: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ExprEvalOutput {
    /// The numeric result as a string (to preserve precision and handle display).
    pub result: String,
    /// true if evaluation succeeded.
    pub success: bool,
    /// Human-readable error if evaluation failed.
    pub error: Option<String>,
}

pub fn process(input: ExprEvalInput) -> ExprEvalOutput {
    let trimmed = input.expression.trim();
    if trimmed.is_empty() {
        return ExprEvalOutput {
            result: String::new(),
            success: true,
            error: None,
        };
    }

    // Normalise to lowercase so built-in functions/constants are case-insensitive.
    // This is safe because we don't support string expressions, only numeric math.
    let normalized = trimmed.to_lowercase();

    // Build a context with extra functions not built into meval
    let mut ctx = meval::Context::new();
    ctx.func("round", |x: f64| x.round());
    ctx.func2("min", |a: f64, b: f64| a.min(b));
    ctx.func2("max", |a: f64, b: f64| a.max(b));

    match normalized.parse::<meval::Expr>() {
        Ok(expr) => match expr.eval_with_context(&ctx) {
            Ok(val) => {
                if val.is_nan() {
                    ExprEvalOutput {
                        result: String::new(),
                        success: false,
                        error: Some("Result is NaN (undefined operation)".into()),
                    }
                } else if val.is_infinite() {
                    ExprEvalOutput {
                        result: String::new(),
                        success: false,
                        error: Some("Division by zero".into()),
                    }
                } else {
                    let formatted = if val.fract() == 0.0 && val.abs() < 1e15 {
                        format!("{}", val as i64)
                    } else {
                        format!("{}", val)
                    };
                    ExprEvalOutput {
                        result: formatted,
                        success: true,
                        error: None,
                    }
                }
            }
            Err(e) => ExprEvalOutput {
                result: String::new(),
                success: false,
                error: Some(e.to_string()),
            },
        },
        Err(e) => ExprEvalOutput {
            result: String::new(),
            success: false,
            error: Some(e.to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn eval(expr: &str) -> ExprEvalOutput {
        process(ExprEvalInput {
            expression: expr.to_string(),
        })
    }

    #[test]
    fn basic_arithmetic() {
        assert_eq!(eval("2 + 3").result, "5");
        assert_eq!(eval("10 - 4").result, "6");
        assert_eq!(eval("3 * 7").result, "21");
        assert_eq!(eval("15 / 3").result, "5");
    }

    #[test]
    fn power() {
        assert_eq!(eval("2^10").result, "1024");
    }

    #[test]
    fn math_functions() {
        assert_eq!(eval("sqrt(9)").result, "3");
        assert_eq!(eval("abs(-5)").result, "5");
        assert_eq!(eval("floor(3.7)").result, "3");
        assert_eq!(eval("ceil(3.2)").result, "4");
        assert_eq!(eval("round(3.5)").result, "4");
    }

    #[test]
    fn min_max() {
        assert_eq!(eval("min(3, 7)").result, "3");
        assert_eq!(eval("max(3, 7)").result, "7");
    }

    #[test]
    fn constants() {
        let pi = eval("pi");
        assert!(pi.success);
        assert!(pi.result.starts_with("3.14159"));

        let e = eval("e");
        assert!(e.success);
        assert!(e.result.starts_with("2.71828"));
    }

    #[test]
    fn case_insensitive_functions_and_constants() {
        assert_eq!(eval("SQRT(9)").result, "3");
        assert_eq!(eval("Min(3, 7)").result, "3");
        assert_eq!(eval("MAX(3, 7)").result, "7");

        let pi_upper = eval("PI");
        assert!(pi_upper.success);
        assert!(pi_upper.result.starts_with("3.14159"));

        let e_mixed = eval("E");
        assert!(e_mixed.success);
        assert!(e_mixed.result.starts_with("2.71828"));
    }

    #[test]
    fn division_by_zero() {
        let out = eval("1 / 0");
        assert!(!out.success);
        assert!(out.error.unwrap().contains("Division by zero"));
    }

    #[test]
    fn invalid_syntax() {
        let out = eval("2 +");
        assert!(!out.success);
        assert!(out.error.is_some());
    }

    #[test]
    fn unknown_function() {
        let out = eval("foo(3)");
        assert!(!out.success);
        assert!(out.error.is_some());
    }

    #[test]
    fn empty_input() {
        let out = eval("");
        assert!(out.success);
        assert_eq!(out.result, "");
    }
}

