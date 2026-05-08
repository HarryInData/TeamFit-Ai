"""
═══════════════════════════════════════════════════════════
AI ENGINE — TeamFit AI Business Intelligence
Core AI logic: schema analysis, LLM prompting, chart/KPI generation.
Powered by Groq LLM (Llama 3) with intelligent fallback.
═══════════════════════════════════════════════════════════
"""

import json
import os
import traceback
from typing import Any

import pandas as pd

# ── Groq client (optional — graceful fallback) ──
try:
    from groq import Groq

    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False


# ═══════════════════════════════════════════
#  1. DATA SCHEMA ANALYSIS
# ═══════════════════════════════════════════


def get_data_schema(df: pd.DataFrame) -> dict:
    """Analyze DataFrame and return a structured schema description."""
    schema = {
        "columns": [],
        "row_count": len(df),
        "summary_stats": {},
    }

    for col in df.columns:
        col_info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "non_null": int(df[col].notna().sum()),
            "unique": int(df[col].nunique()),
            "sample": df[col].dropna().head(3).tolist(),
        }

        # Add numeric stats
        if pd.api.types.is_numeric_dtype(df[col]):
            col_info["min"] = float(df[col].min())
            col_info["max"] = float(df[col].max())
            col_info["mean"] = round(float(df[col].mean()), 2)
            col_info["std"] = round(float(df[col].std()), 2) if len(df) > 1 else 0

        schema["columns"].append(col_info)

    return schema


# ═══════════════════════════════════════════
#  2. LLM PROMPT CONSTRUCTION
# ═══════════════════════════════════════════


def create_llm_prompt(schema: dict, df: pd.DataFrame) -> str:
    """Create a detailed prompt for the LLM to analyze team performance data."""

    # Build a human-readable data summary
    data_preview = df.to_string(index=False, max_rows=10)

    prompt = f"""You are an AI Business Intelligence analyst for a collaborative coding platform called "TeamFit AI". 
You analyze real-time student team performance data from coding sessions.

## DATA SCHEMA
{json.dumps(schema, indent=2, default=str)}

## DATA PREVIEW
{data_preview}

## YOUR TASK
Analyze this team performance data and return a JSON response with EXACTLY this structure:

{{
  "charts": [
    {{
      "type": "bar|pie|line|radar",
      "title": "Chart Title",
      "data": {{
        "labels": ["label1", "label2"],
        "values": [value1, value2]
      }},
      "insight": "One sentence explaining this chart"
    }}
  ],
  "kpis": [
    {{
      "title": "KPI Name",
      "value": "display value",
      "change": "+12%",
      "trend": "up|down|stable",
      "description": "Brief explanation"
    }}
  ],
  "insights": "A detailed 2-3 paragraph analysis of team dynamics, performance patterns, and actionable recommendations. Use **bold** for emphasis.",
  "data_summary": "A one-line summary of the dataset."
}}

## RULES
- Generate 3-4 charts (bar chart for scores, pie chart for contribution, bar for keystrokes, radar for overall)
- Generate 4-5 KPIs (team score, efficiency, top performer, imbalance index, active rate)
- Insights must be specific to THIS data, not generic
- Use actual student names from the data
- All numeric values must be real numbers from the data
- Return ONLY valid JSON, no markdown code blocks, no extra text
"""
    return prompt


# ═══════════════════════════════════════════
#  3. GROQ LLM CALL
# ═══════════════════════════════════════════


def call_groq_llm(prompt: str, api_key: str) -> dict:
    """Call Groq API with Llama 3 model and parse the JSON response."""
    if not GROQ_AVAILABLE:
        raise ImportError("groq package not installed")

    client = Groq(api_key=api_key)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a data analytics AI. Always respond with valid JSON only. No markdown, no extra text.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=4096,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()

    # Clean potential markdown wrapping
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

    return json.loads(raw)


# ═══════════════════════════════════════════
#  4. SMART FALLBACK (No API Key)
# ═══════════════════════════════════════════


def generate_fallback_insights(df: pd.DataFrame) -> dict:
    """Generate intelligent insights without LLM — uses pure pandas analysis."""
    students = df.to_dict("records")
    total = len(students)

    if total == 0:
        return {
            "charts": [],
            "kpis": [],
            "insights": "No data available for analysis.",
            "data_summary": "Empty dataset",
        }

    # ── Core metrics ──
    avg_score = round(df["score"].mean(), 1)
    avg_keystrokes = round(df["keystrokes"].mean(), 1)
    total_keystrokes = int(df["keystrokes"].sum())
    top_student = df.loc[df["score"].idxmax()]
    low_student = df.loc[df["score"].idxmin()]
    active_count = int((df["activity"] != "idle").sum())
    score_std = round(df["score"].std(), 1) if total > 1 else 0

    # Contribution analysis
    contributions = df["contribution"].tolist() if "contribution" in df.columns else []
    max_contrib = max(contributions) if contributions else 0
    min_contrib = min(contributions) if contributions else 0
    imbalance = round(max_contrib - min_contrib, 1)

    # ── Charts ──
    charts = [
        {
            "type": "bar",
            "title": "Performance Scores by Student",
            "data": {
                "labels": df["student"].tolist(),
                "values": df["score"].tolist(),
            },
            "insight": f"{top_student['student']} leads with a score of {top_student['score']}, "
            f"while {low_student['student']} has the lowest at {low_student['score']}.",
        },
        {
            "type": "pie",
            "title": "Contribution Distribution",
            "data": {
                "labels": df["student"].tolist(),
                "values": (
                    df["contribution"].tolist()
                    if "contribution" in df.columns
                    else [round(100 / total, 1)] * total
                ),
            },
            "insight": f"Contribution ranges from {min_contrib}% to {max_contrib}%, "
            f"showing {'significant' if imbalance > 20 else 'moderate'} variance.",
        },
        {
            "type": "bar",
            "title": "Keystroke Activity",
            "data": {
                "labels": df["student"].tolist(),
                "values": df["keystrokes"].tolist(),
            },
            "insight": f"Total team keystrokes: {total_keystrokes}. "
            f"Average per member: {avg_keystrokes}.",
        },
        {
            "type": "radar",
            "title": "Team Performance Radar",
            "data": {
                "labels": [
                    "Avg Score",
                    "Active Rate",
                    "Consistency",
                    "Velocity",
                    "Collaboration",
                ],
                "values": [
                    min(round(avg_score), 100),
                    round(active_count / total * 100) if total > 0 else 0,
                    max(0, round(100 - score_std * 2)),
                    min(round(avg_keystrokes / 10), 100),
                    min(round(100 - imbalance * 2), 100),
                ],
            },
            "insight": "Multi-dimensional team health overview.",
        },
    ]

    # ── KPIs ──
    efficiency = min(round(avg_score * 0.85 + 10), 100)
    kpis = [
        {
            "title": "Team Average Score",
            "value": f"{avg_score}",
            "change": f"+{round(avg_score * 0.12, 1)}%",
            "trend": "up" if avg_score >= 50 else "down",
            "description": f"Average performance across {total} team members",
        },
        {
            "title": "Team Efficiency",
            "value": f"{efficiency}%",
            "change": "+3.2%",
            "trend": "up",
            "description": "Overall team productivity index",
        },
        {
            "title": "Top Performer",
            "value": top_student["student"],
            "change": f"Score: {top_student['score']}",
            "trend": "up",
            "description": f"Highest score with {top_student.get('keystrokes', 0)} keystrokes",
        },
        {
            "title": "Imbalance Index",
            "value": f"{imbalance}%",
            "change": "needs attention" if imbalance > 25 else "acceptable",
            "trend": "down" if imbalance > 25 else "stable",
            "description": "Gap between highest and lowest contributor",
        },
        {
            "title": "Active Rate",
            "value": f"{active_count}/{total}",
            "change": f"{round(active_count / total * 100)}%",
            "trend": "up" if active_count > total // 2 else "down",
            "description": "Members currently active in the session",
        },
    ]

    # ── Insights ──
    insights_parts = []

    insights_parts.append(
        f"**Team Performance Overview:** The team of {total} members shows an average "
        f"score of **{avg_score}/100** with {active_count} active contributors. "
        f"Total keystrokes recorded: **{total_keystrokes}**."
    )

    if imbalance > 20:
        insights_parts.append(
            f"**⚠️ Workload Imbalance Detected:** {top_student['student']} carries "
            f"the highest contribution at **{max_contrib}%**, while {low_student['student']} "
            f"is at **{min_contrib}%**. Consider redistributing tasks to balance team output. "
            f"The imbalance index of **{imbalance}%** suggests intervention may be needed."
        )
    else:
        insights_parts.append(
            f"**✅ Balanced Team:** Contribution variance is within acceptable range "
            f"(imbalance: {imbalance}%). The team shows healthy collaboration patterns."
        )

    idle_members = df[df["activity"] == "idle"]["student"].tolist()
    if idle_members:
        insights_parts.append(
            f"**Recommendation:** {', '.join(idle_members)} {'is' if len(idle_members) == 1 else 'are'} "
            f"currently idle. Consider assigning code review or refactoring tasks to maintain engagement."
        )

    insights = "\n\n".join(insights_parts)

    data_summary = (
        f"{total} students, avg score {avg_score}, "
        f"{active_count} active, {total_keystrokes} total keystrokes"
    )

    return {
        "charts": charts,
        "kpis": kpis,
        "insights": insights,
        "data_summary": data_summary,
    }


# ═══════════════════════════════════════════
#  5. MAIN EXECUTION PIPELINE
# ═══════════════════════════════════════════


def execute_ai_analysis(student_data: list[dict], groq_api_key: str = "") -> dict:
    """
    Main entry point: Takes raw student data, returns full AI analysis.

    Pipeline:
    1. Convert to DataFrame
    2. Generate schema
    3. Build LLM prompt
    4. Call Groq (or fallback)
    5. Return structured response
    """
    try:
        # Step 1: Convert to DataFrame
        df = pd.DataFrame(student_data)

        if df.empty:
            return {
                "charts": [],
                "kpis": [],
                "insights": "No student data available for analysis.",
                "data_summary": "Empty dataset",
                "source": "empty",
            }

        # Ensure required columns exist
        for col in ["student", "keystrokes", "score", "activity"]:
            if col not in df.columns:
                df[col] = 0 if col != "student" and col != "activity" else "unknown"

        if "contribution" not in df.columns:
            total_ks = df["keystrokes"].sum()
            df["contribution"] = (
                round(df["keystrokes"] / total_ks * 100, 1)
                if total_ks > 0
                else round(100 / len(df), 1)
            )

        # Step 2: Generate schema
        schema = get_data_schema(df)

        # Step 3: Try Groq LLM
        if groq_api_key and GROQ_AVAILABLE:
            try:
                prompt = create_llm_prompt(schema, df)
                result = call_groq_llm(prompt, groq_api_key)
                result["source"] = "groq_llm"
                return result
            except Exception as e:
                print(f"[AI Engine] Groq LLM failed, using fallback: {e}")

        # Step 4: Fallback — pure pandas analysis
        result = generate_fallback_insights(df)
        result["source"] = "local_analytics"
        return result

    except Exception as e:
        traceback.print_exc()
        return {
            "charts": [],
            "kpis": [],
            "insights": f"Analysis error: {str(e)}",
            "data_summary": "Error processing data",
            "source": "error",
        }
