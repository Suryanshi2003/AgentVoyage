import os
import certifi
from dotenv import load_dotenv

load_dotenv()

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from typing import TypedDict, Annotated
import operator
import uuid

import psycopg
from psycopg.rows import dict_row

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres import PostgresSaver
from langchain_core.messages import (
    AnyMessage,
    HumanMessage,
    AIMessage,
    SystemMessage,
)
from langchain_groq import ChatGroq
from tools.tavily_tool import tavily_search
from tools.flight_tool import search_flights


def get_database_url():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise ValueError(
            "DATABASE_URL is missing. Please add your Render PostgreSQL External Database URL to .env"
        )

    if "sslmode=" not in database_url:
        separator = "&" if "?" in database_url else "?"
        database_url = f"{database_url}{separator}sslmode=require"

    return database_url


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please add it to your .env file.")


# =========================
# LLM
# =========================

llm = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=GROQ_API_KEY
)


# =========================
# State
# =========================

class TravelState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    user_query: str
    flight_results: str
    hotel_results: str
    itinerary: str
    llm_calls: int


# =========================
# Flight Agent
# =========================

def flight_agent(state: TravelState):
    query = state["user_query"]
    flight_data = search_flights(query)

    return {
        "flight_results": flight_data,
        "messages": [
            AIMessage(content="Flight results fetched.")
        ],
        "llm_calls": state.get("llm_calls", 0) + 1
    }



# =========================
# Hotel Agent
# =========================

def hotel_agent(state: TravelState):
    query = f"Best hotels for {state['user_query']}"
    raw_hotel_data = tavily_search(query)

    # tavily_search() returns raw scraped web content - broken markdown,
    # image alt-text placeholders, bare URLs, half-formed tables. Never
    # show that to a user. Pass it through the LLM once to turn it into
    # a short, clean list before it goes anywhere near the frontend.
    cleanup_prompt = f"""
You are cleaning up messy raw web search results about hotels so they can
be shown directly to a traveler.

Traveler's request:
{state['user_query']}

Raw search results:
{raw_hotel_data}

Turn this into 3-5 hotel suggestions that actually fit the traveler's request
above (destination, dates, budget level). Skip any hotel in the raw results
that clearly doesn't match. For each hotel, include:
- Hotel name
- Area / neighborhood
- Approximate price per night, if it's mentioned
- A booking link, if one appears in the raw results for that hotel (format
  it as a markdown link, e.g. [Book here](https://...); write "Link not
  available" if there truly isn't one)
- 2-3 short highlights (amenities, room type, standout feature)
- One line on who it best suits (e.g. "Good for couples", "Best for budget travelers")

Formatting rules:
- Plain markdown bullet list, one hotel per bullet, nothing else before or after it.
- No image placeholders (like "accommodation_icon") or broken tables.
- No mention of where the data came from (no "according to", no source names).
- If a hotel's price isn't mentioned, write "Price not listed" instead of guessing.
- Keep the whole thing under 250 words.
"""

    response = llm.invoke([
        SystemMessage(content="You turn messy scraped web search results into a short, clean hotel list that matches what the traveler actually asked for."),
        HumanMessage(content=cleanup_prompt)
    ])

    return {
        "hotel_results": response.content,
        "messages": [
            AIMessage(content="Hotel information fetched.")
        ],
        "llm_calls": state.get("llm_calls", 0) + 1
    }



# =========================
# Itinerary Agent
# =========================

def itinerary_agent(state: TravelState):
    prompt = f"""
Create a complete travel itinerary based on the details below.

User Query:
{state['user_query']}

Flight Results:
{state['flight_results']}

Hotel Results:
{state['hotel_results']}

Formatting rules:
- For each day, use exactly three blocks: Morning, Afternoon, Evening.
- Do NOT write an hour-by-hour schedule (no "9:00 AM", "9:30 AM", etc.) — that's
  overwhelming to read. One or two short lines per block is enough (e.g.
  "Morning: Visit Fushimi Inari, arrive early to beat crowds").
- Make sure the plan actually matches what the user asked for — the right
  destination, number of days, budget level, and interests. Don't add
  activities that don't fit the stated budget or trip length.
- Keep it practical and easy to scan, not exhaustive.
"""

    response = llm.invoke([
        SystemMessage(content="You are an expert travel planner who writes short, scannable itineraries grouped into Morning/Afternoon/Evening blocks — never hour-by-hour schedules."),
        HumanMessage(content=prompt)
    ])

    return {
        "itinerary": response.content,
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1
    }



# =========================
# Final Response Agent
# =========================

def final_agent(state: TravelState):
    final_prompt = f"""
Generate the final travel response for the user.

User Request:
{state['user_query']}

Flights:
{state['flight_results']}

Hotels:
{state['hotel_results']}

Itinerary:
{state['itinerary']}

Format the final answer using these sections:

1. Trip Summary
   Start with one line exactly like this: **Destination:** <city, country>
   Then 2-3 short sentences: dates, purpose, and overall budget level.

2. Flight Information
   Keep whatever is in the flight results above — don't re-invent or rewrite it.

3. Hotel Suggestions
   Keep whatever is in the hotel results above — don't re-invent or rewrite it.

4. Day-by-Day Itinerary
   Keep the Morning/Afternoon/Evening structure from the itinerary above.
   Do not turn it back into an hour-by-hour schedule.

5. Estimated Budget
   Give a short markdown table with one row per category: Flights, Hotel
   (total for all nights), Meals, Local Transport, Activities/Entry Fees,
   and a final Total row that is the actual sum of the rows above it. Base
   the numbers on the flight/hotel data above and the budget level the
   user asked for. Add one short sentence after the table at most.

6. Final Recommendations
   2-3 short, specific tips for this exact trip. No generic filler
   ("pack comfortable shoes") unless it's genuinely relevant here.

Important:
- Every section must reflect what the user actually asked for — the right
  destination, dates, duration, budget tier, and interests. If the query
  mentioned something (e.g. a specific interest, a day trip, a traveler
  count) that isn't addressed above, make sure it's covered here.
- Be concise throughout — this is a summary the traveler will scan, not an essay.
- Do not mention APIs, data providers, or where information came from.
"""

    response = llm.invoke([
        SystemMessage(content="You are a professional AI travel booking assistant. You write concise, accurate, well-organized travel plans - never bloated or repetitive."),
        HumanMessage(content=final_prompt)
    ])

    return {
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1
    }


# =========================
# Build Graph
# =========================

graph = StateGraph(TravelState)

graph.add_node("flight_agent", flight_agent)
graph.add_node("hotel_agent", hotel_agent)
graph.add_node("itinerary_agent", itinerary_agent)
graph.add_node("final_agent", final_agent)

graph.add_edge(START, "flight_agent")
graph.add_edge("flight_agent", "hotel_agent")
graph.add_edge("hotel_agent", "itinerary_agent")
graph.add_edge("itinerary_agent", "final_agent")
graph.add_edge("final_agent", END)


# =========================
# PostgreSQL Checkpointer
# =========================
DATABASE_URL = get_database_url()

_conn = psycopg.connect(
    DATABASE_URL,
    autocommit=True,
    row_factory=dict_row
)

checkpointer = PostgresSaver(_conn)
checkpointer.setup()

travel_graph = graph.compile(checkpointer=checkpointer)



# =========================
# Function for FastAPI
# =========================

def run_travel_agent(user_input: str, thread_id: str | None = None):
    if not thread_id:
        thread_id = f"user_{uuid.uuid4().hex}"

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    result = travel_graph.invoke(
        {
            "messages": [
                HumanMessage(content=user_input)
            ],
            "user_query": user_input,
            "flight_results": "",
            "hotel_results": "",
            "itinerary": "",
            "llm_calls": 0
        },
        config=config
    )

    final_answer = result["messages"][-1].content

    return {
        "thread_id": thread_id,
        "answer": final_answer,
        "flight_results": result.get("flight_results", ""),
        "hotel_results": result.get("hotel_results", ""),
        "itinerary": result.get("itinerary", ""),
        "llm_calls": result.get("llm_calls", 0),
    }