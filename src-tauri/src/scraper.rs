use reqwest::Client;
use scraper::{Html, Selector};

pub async fn search_web_for_tech_stack(
    tech_stack: &[String],
    primary_language: &str,
) -> Result<Vec<String>, String> {
    println!("[Web Scrape] Validating tech stack: {:?}", tech_stack);

    let language = match primary_language.to_lowercase().as_str() {
        "python" => "python",
        "javascript" | "typescript" => "javascript",
        "java" => "java",
        "go" => "go",
        "ruby" => "ruby",
        _ => "all",
    };

    let client = Client::new();
    let url = if language == "all" {
        "https://github.com/trending".to_string()
    } else {
        format!("https://github.com/trending?language={}", language)
    };

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch GitHub trending: {}", e))?;
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let document = Html::parse_document(&body);
    let selector =
        Selector::parse("h2.h3 a").map_err(|e| format!("Failed to parse selector: {}", e))?;
    let mut updated_stack = tech_stack.to_vec();

    for element in document.select(&selector) {
        let text = element.text().collect::<Vec<_>>().join("").to_lowercase();
        if language == "python"
            && text.contains("django")
            && !updated_stack.iter().any(|t| t.to_lowercase() == "django")
        {
            updated_stack.push("Django".to_string());
        } else if language == "javascript"
            && text.contains("typescript")
            && !updated_stack.iter().any(|t| t.to_lowercase() == "typescript")
        {
            updated_stack.push("TypeScript".to_string());
        } else if language == "java"
            && text.contains("spring")
            && !updated_stack.iter().any(|t| t.to_lowercase() == "spring")
        {
            updated_stack.push("Spring".to_string());
        }
    }

    Ok(updated_stack)
}