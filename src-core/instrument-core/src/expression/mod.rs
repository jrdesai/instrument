//! Expression evaluator — numeric math via the in-crate parser in `parser.rs`.

mod parser;

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

    match parser::evaluate(&normalized) {
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

    #[test]
    fn precedence_and_grouping() {
        assert_eq!(eval("2 + 3 * 4").result, "14");
        assert_eq!(eval("(2 + 3) * 4").result, "20");
        assert_eq!(eval("10 - 4 - 3").result, "3");
        assert_eq!(eval("24 / 4 / 2").result, "3");
    }

    #[test]
    fn power_is_right_associative_and_binds_tighter_than_unary_minus() {
        assert_eq!(eval("2^3^2").result, "512");
        assert_eq!(eval("-2^2").result, "-4");
        assert_eq!(eval("2^-1").result, "0.5");
        assert_eq!(eval("--3").result, "3");
    }

    #[test]
    fn modulo_and_decimals() {
        assert_eq!(eval("10 % 3").result, "1");
        assert_eq!(eval(".5 + 1.25").result, "1.75");
        assert_eq!(eval("1.5e3").result, "1500");
    }

    #[test]
    fn extended_functions() {
        assert_eq!(eval("min(4, 2, 8)").result, "2");
        assert_eq!(eval("max(4, 2, 8)").result, "8");
        assert_eq!(eval("ln(e)").result, "1");
        assert_eq!(eval("signum(-7)").result, "-1");
        assert!(eval("atan2(1, 1)").result.starts_with("0.785"));
        assert_eq!(eval("sin(0) + cos(0)").result, "1");
    }

    #[test]
    fn placeholder_examples_evaluate() {
        assert!(eval("sqrt(2) + 3^2").result.starts_with("10.414"));
        assert!(eval("pi * 2").result.starts_with("6.283"));
        assert_eq!(eval("min(10, 20) / max(3, 5)").result, "2");
    }

    #[test]
    fn malformed_input_errors() {
        for bad in ["(2 + 3", "2 3", "sqrt(1, 2)", "atan2(1)", "max()", "x + 1", "2 $ 3", "2e"] {
            let out = eval(bad);
            assert!(!out.success, "expected failure for {bad:?}");
            assert!(out.error.is_some());
        }
        assert!(eval("sqrt(-1)").error.unwrap().contains("NaN"));
    }

    #[test]
    fn deep_nesting_is_rejected_not_overflowed() {
        let deep = format!("{}1{}", "(".repeat(10_000), ")".repeat(10_000));
        let out = eval(&deep);
        assert!(!out.success);
        assert!(out.error.unwrap().contains("nested too deeply"));
        assert!(!eval(&"-".repeat(10_000)).success);
    }
}

