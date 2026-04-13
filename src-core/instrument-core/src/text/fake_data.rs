//! Fake data generator — schema-driven JSON records via the `fake` crate.

use fake::faker::address::en::*;
use fake::faker::chrono::en::*;
use fake::faker::color::en::Color;
use fake::faker::company::en::*;
use fake::faker::internet::en::*;
use fake::faker::job::en::Title as JobTitle;
use fake::faker::lorem::en::*;
use fake::faker::name::en::*;
use fake::faker::phone_number::en::PhoneNumber;
use fake::Fake;
use rand::Rng;
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// One field definition in the schema.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FakeField {
    /// The key name in the output JSON object.
    pub name: String,
    /// The data type identifier (e.g. "email", "city", "uuid").
    pub field_type: String,
    /// Optional parameters for parameterised types.
    #[ts(type = "Record<string, unknown> | null")]
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FakeDataInput {
    pub fields: Vec<FakeField>,
    /// Number of records to generate (capped at 500).
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FakeDataOutput {
    /// Pretty-printed JSON array of generated records.
    pub json: String,
    pub error: Option<String>,
}

/// Generate a single value for the given field type.
fn generate_value(
    field_type: &str,
    params: Option<&serde_json::Value>,
    index: usize,
) -> serde_json::Value {
    use serde_json::Value;

    match field_type {
        "full_name" => Value::String(Name().fake()),
        "first_name" => Value::String(FirstName().fake()),
        "last_name" => Value::String(LastName().fake()),
        "email" => Value::String(SafeEmail().fake()),
        "username" => Value::String(Username().fake()),
        "phone" => Value::String(PhoneNumber().fake()),

        "street" => Value::String(StreetName().fake()),
        "city" => Value::String(CityName().fake()),
        "state" => Value::String(StateName().fake()),
        "country" => Value::String(CountryName().fake()),
        "country_code" => Value::String(CountryCode().fake()),
        "zip" => Value::String(PostCode().fake()),
        "latitude" => {
            let lat: f64 = Latitude().fake();
            Value::Number(
                serde_json::Number::from_f64((lat * 1_000_000.0).round() / 1_000_000.0)
                    .unwrap_or(serde_json::Number::from(0)),
            )
        }
        "longitude" => {
            let lon: f64 = Longitude().fake();
            Value::Number(
                serde_json::Number::from_f64((lon * 1_000_000.0).round() / 1_000_000.0)
                    .unwrap_or(serde_json::Number::from(0)),
            )
        }

        "company" => Value::String(CompanyName().fake()),
        "industry" => Value::String(Industry().fake()),
        "job_title" => Value::String(JobTitle().fake()),
        "catch_phrase" => Value::String(CatchPhrase().fake()),

        "domain" => {
            let suffix: String = DomainSuffix().fake();
            let user: String = Username().fake();
            Value::String(format!("{user}.{suffix}"))
        }
        "ipv4" => Value::String(IPv4().fake()),
        "color" => Value::String(Color().fake()),
        "user_agent" => Value::String(UserAgent().fake()),

        "word" => Value::String(Word().fake()),
        "sentence" => Value::String(Sentence(5..12).fake()),
        "paragraph" => Value::String(Paragraph(2..5).fake()),

        "integer" => {
            let min = params
                .and_then(|p| p.get("min"))
                .and_then(|v| v.as_i64())
                .unwrap_or(1);
            let max = params
                .and_then(|p| p.get("max"))
                .and_then(|v| v.as_i64())
                .unwrap_or(10_000);
            let (lo, hi) = if min <= max { (min, max) } else { (max, min) };
            let n = rand::thread_rng().gen_range(lo..=hi);
            Value::Number(serde_json::Number::from(n))
        }
        "float" => {
            let min = params
                .and_then(|p| p.get("min"))
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let max = params
                .and_then(|p| p.get("max"))
                .and_then(|v| v.as_f64())
                .unwrap_or(1.0);
            let decimals = params
                .and_then(|p| p.get("decimals"))
                .and_then(|v| v.as_u64())
                .unwrap_or(2)
                .min(8) as i32;
            let (lo, hi) = if min <= max { (min, max) } else { (max, min) };
            let f: f64 = rand::thread_rng().gen_range(lo..hi);
            let scale = 10f64.powi(decimals);
            Value::Number(
                serde_json::Number::from_f64((f * scale).round() / scale)
                    .unwrap_or(serde_json::Number::from(0)),
            )
        }
        "boolean" => Value::Bool(rand::thread_rng().gen_bool(0.5)),

        "uuid" => Value::String(uuid::Uuid::new_v4().to_string()),
        "date" => Value::String(Date().fake::<chrono::NaiveDate>().to_string()),
        "datetime" => Value::String(
            DateTime()
                .fake::<chrono::DateTime<chrono::Utc>>()
                .to_rfc3339(),
        ),
        "timestamp" => {
            let ts = rand::thread_rng().gen_range(0i64..=1_893_456_000);
            Value::Number(serde_json::Number::from(ts))
        }

        "custom_list" => {
            let values = params
                .and_then(|p| p.get("values"))
                .and_then(|v| v.as_array());
            match values {
                Some(list) if !list.is_empty() => {
                    let idx = rand::thread_rng().gen_range(0..list.len());
                    list[idx].clone()
                }
                _ => Value::String(String::new()),
            }
        }

        "counter" => {
            let start = params
                .and_then(|p| p.get("start"))
                .and_then(|v| v.as_i64())
                .unwrap_or(1);
            let step = params
                .and_then(|p| p.get("step"))
                .and_then(|v| v.as_i64())
                .unwrap_or(1);
            Value::Number(serde_json::Number::from(start + (index as i64) * step))
        }

        _ => Value::String(format!("<unknown:{field_type}>")),
    }
}

pub fn process(input: FakeDataInput) -> FakeDataOutput {
    if input.fields.is_empty() {
        return FakeDataOutput {
            json: "[]".to_string(),
            error: Some("Add at least one field to generate data.".to_string()),
        };
    }

    let count = input.count.clamp(1, 500);
    let mut records = Vec::with_capacity(count);

    for i in 0..count {
        let mut obj = serde_json::Map::new();
        for field in &input.fields {
            let key = field.name.trim().to_string();
            if key.is_empty() {
                continue;
            }
            obj.insert(
                key,
                generate_value(&field.field_type, field.params.as_ref(), i),
            );
        }
        records.push(serde_json::Value::Object(obj));
    }

    match serde_json::to_string_pretty(&records) {
        Ok(json) => FakeDataOutput { json, error: None },
        Err(e) => FakeDataOutput {
            json: String::new(),
            error: Some(format!("Serialization failed: {e}")),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn field(name: &str, field_type: &str) -> FakeField {
        FakeField {
            name: name.into(),
            field_type: field_type.into(),
            params: None,
        }
    }

    fn field_with(name: &str, field_type: &str, params: serde_json::Value) -> FakeField {
        FakeField {
            name: name.into(),
            field_type: field_type.into(),
            params: Some(params),
        }
    }

    fn make(fields: Vec<FakeField>, count: usize) -> FakeDataInput {
        FakeDataInput { fields, count }
    }

    #[test]
    fn generates_correct_count() {
        let out = process(make(
            vec![field("name", "full_name"), field("email", "email")],
            10,
        ));
        assert!(out.error.is_none());
        let arr: Vec<serde_json::Value> = serde_json::from_str(&out.json).expect("json");
        assert_eq!(arr.len(), 10);
    }

    #[test]
    fn all_standard_field_types_produce_values() {
        let fields = vec![
            field("a", "full_name"),
            field("b", "email"),
            field("c", "city"),
            field("d", "company"),
            field("e", "uuid"),
            field("f", "integer"),
            field("g", "boolean"),
            field("h", "date"),
            field("i", "sentence"),
        ];
        let out = process(make(fields, 3));
        assert!(out.error.is_none());
        let arr: Vec<serde_json::Value> = serde_json::from_str(&out.json).expect("json");
        assert_eq!(arr.len(), 3);
        for record in &arr {
            assert!(record["a"].is_string());
            assert!(record["f"].is_number());
            assert!(record["g"].is_boolean());
        }
    }

    #[test]
    fn count_capped_at_500() {
        let out = process(make(vec![field("x", "uuid")], 9999));
        let arr: Vec<serde_json::Value> = serde_json::from_str(&out.json).expect("json");
        assert_eq!(arr.len(), 500);
    }

    #[test]
    fn empty_fields_returns_error() {
        let out = process(FakeDataInput {
            fields: vec![],
            count: 5,
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn skips_blank_field_names() {
        let out = process(make(vec![field("", "email"), field("id", "uuid")], 1));
        let arr: Vec<serde_json::Value> = serde_json::from_str(&out.json).expect("json");
        assert!(arr[0].get("").is_none());
        assert!(arr[0]["id"].is_string());
    }

    #[test]
    fn counter_increments_correctly() {
        let out = process(make(
            vec![field_with(
                "n",
                "counter",
                serde_json::json!({ "start": 10, "step": 5 }),
            )],
            3,
        ));
        let arr: Vec<serde_json::Value> = serde_json::from_str(&out.json).expect("json");
        assert_eq!(arr[0]["n"], 10);
        assert_eq!(arr[1]["n"], 15);
        assert_eq!(arr[2]["n"], 20);
    }

    #[test]
    fn custom_list_picks_from_values() {
        let params = serde_json::json!({ "values": ["active", "inactive", "pending"] });
        let out = process(make(vec![field_with("status", "custom_list", params)], 50));
        let arr: Vec<serde_json::Value> = serde_json::from_str(&out.json).expect("json");
        for record in &arr {
            let v = record["status"].as_str().expect("str");
            assert!(["active", "inactive", "pending"].contains(&v));
        }
    }

    #[test]
    fn integer_range_respected() {
        let params = serde_json::json!({ "min": 18, "max": 65 });
        let out = process(make(vec![field_with("age", "integer", params)], 100));
        let arr: Vec<serde_json::Value> = serde_json::from_str(&out.json).expect("json");
        for record in &arr {
            let n = record["age"].as_i64().expect("int");
            assert!((18..=65).contains(&n));
        }
    }

    #[test]
    fn float_range_and_decimals_respected() {
        let params = serde_json::json!({ "min": 1.0, "max": 5.0, "decimals": 2 });
        let out = process(make(vec![field_with("rating", "float", params)], 50));
        let arr: Vec<serde_json::Value> = serde_json::from_str(&out.json).expect("json");
        for record in &arr {
            let f = record["rating"].as_f64().expect("float");
            assert!((1.0..=5.0).contains(&f));
        }
    }
}
