# AgentVoyage

A multi-agent AI travel planning application built with LangGraph that
coordinates specialized AI agents to help users plan personalized trips.

## Overview

Planning a trip often requires visiting multiple platforms for flights,
hotels, destinations, and activities. AgentVoyage brings these tasks
together into a single AI-powered workflow.

The application uses specialized agents that collaborate to research
travel options, generate itineraries, and create a complete travel plan
based on user preferences.

## Features

-   Multi-agent travel planning using LangGraph
-   Flight information research
-   Hotel and accommodation recommendations
-   Personalized itinerary generation
-   Web-based research using Tavily
-   AI-powered reasoning and recommendations using Groq LLMs
-   Persistent workflow state using PostgreSQL checkpointing
-   FastAPI backend for APIs and agent orchestration
-   Angular frontend for an interactive user experience

## Architecture

``` text
                    User
                     |
                     v
              Angular Frontend
                     |
                     v
               FastAPI Backend
                     |
                     v
               LangGraph Workflow
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
 Flight Agent   Hotel Agent   Itinerary Agent
       |             |             |
       +-------------+-------------+
                     |
                     v
                Final Agent
                     |
                     v
              Complete Trip Plan
```

## Agents

### Flight Agent

Researches flight-related information and identifies suitable travel
options.

### Hotel Agent

Finds and recommends accommodation options based on the destination and
user preferences.

### Itinerary Agent

Creates a structured day-by-day itinerary by considering destinations,
activities, and travel requirements.

### Final Agent

Combines the outputs from the specialized agents into a complete and
coherent travel plan.

## Tech Stack

### Backend

-   Python
-   FastAPI
-   LangGraph
-   LangChain
-   LangChain Groq
-   Tavily Search
-   PostgreSQL
-   Psycopg

### Frontend

-   Angular
-   TypeScript
-   HTML
-   CSS

### AI and Tools

-   Groq LLM
-   LangGraph multi-agent orchestration
-   Tavily web search
-   PostgreSQL checkpointing

## Project Structure

``` text
AgentVoyage/
|
+-- frontend/              # Angular frontend application
|   +-- src/
|   +-- package.json
|   +-- angular.json
|   +-- Dockerfile
|   +-- nginx.conf
|
+-- tools/                 # Custom tools used by AI agents
|   +-- __init__.py
|   +-- flight_tool.py
|   +-- tavily_tool.py
|
+-- app.py                 # Main FastAPI application
+-- backend.py             # Backend and agent workflow logic
+-- requirements.txt       # Python dependencies
+-- Dockerfile             # Backend Dockerfile
+-- docker-compose.yml     # Multi-container configuration
+-- .dockerignore
+-- .env.example
+-- README.md
```

## Installation

### Prerequisites

-   Python 3.12+
-   Node.js 20+
-   PostgreSQL
-   Docker (optional)

### Clone the Repository

``` bash
git clone https://github.com/Suryanshi2003/AgentVoyage.git
cd AgentVoyage
```

## Backend Setup

Create and activate a virtual environment.

### Windows

``` bash
python -m venv .venv
.venv\Scripts\activate
```

### Linux/macOS

``` bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

``` bash
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file in the project root.

``` env
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
DATABASE_URL=your_postgresql_database_url
```

Never commit your `.env` file to GitHub.

## Running the Backend

Start the FastAPI server:

``` bash
uvicorn app:app --reload
```

The backend will be available at:

``` text
http://localhost:8000
```

Interactive API documentation:

``` text
http://localhost:8000/docs
```

## Frontend Setup

Navigate to the frontend directory:

``` bash
cd frontend
```

Install dependencies:

``` bash
npm install
```

Start the Angular development server:

``` bash
ng serve
```

The frontend will be available at:

``` text
http://localhost:4200
```

## Running with Docker

### Build the Backend Image

From the project root:

``` bash
docker build -t agentvoyage-backend .
```

Run the backend container:

``` bash
docker run --env-file .env -p 8000:8000 agentvoyage-backend
```

### Build the Frontend Image

From the frontend directory:

``` bash
cd frontend
docker build -t agentvoyage-frontend .
```

Run the frontend container:

``` bash
docker run -p 4200:80 agentvoyage-frontend
```

## Multi-Agent Workflow

The application follows a sequential workflow where each specialized
agent contributes to the final result.

``` text
User Input
    |
    v
Flight Agent
    |
    v
Hotel Agent
    |
    v
Itinerary Agent
    |
    v
Final Agent
    |
    v
Personalized Travel Plan
```

LangGraph manages the state and transitions between agents, allowing the
workflow to maintain context throughout the planning process.

## Database and State Persistence

PostgreSQL is used for application data and workflow state persistence.

LangGraph PostgreSQL checkpointing enables persistence of agent
conversations and workflow execution states. This helps maintain context
across interactions and supports reliable multi-step agent workflows.

## Future Improvements

-   Real-time flight and hotel booking integrations
-   More specialized travel agents
-   Budget optimization agent
-   Weather-aware itinerary planning
-   Travel document and visa information agent
-   User authentication and saved trips
-   Evaluation framework for measuring agent response quality
-   Production deployment with containerized infrastructure

## Why AgentVoyage?

Traditional travel planning requires switching between multiple websites
and manually combining information.

AgentVoyage demonstrates how multiple AI agents can collaborate to
automate complex, multi-step workflows while keeping each agent focused
on a specific responsibility.


