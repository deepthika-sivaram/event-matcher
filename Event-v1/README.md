# Event Matcher System

A dual-interface system for managing events and matching attendees to sponsors:

1. **MCP Server**: Connects Claude Desktop to a local SQLite database for AI-powered queries.
2. **Streamlit WebApp**: A React-style dashboard backed by Firebase for managing events and bulk data import.

---

## 🚀 Global Setup

### 1. Clone the Repository

```bash
git clone https://github.com/kambleakash0/event-matcher.git
cd event-matcher
```

### 2. Set Up Virtual Environment

```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 🤖 Part 1: MCP Server (Claude Desktop)

This component allows you to talk to your local database via Claude.

### 1. Initialize SQLite Database

Creates the `event_matcher.db` file and seeds it with initial data.

```bash
alembic upgrade head
python seed.py
```

### 2. Configure Claude Desktop

Add the server to your config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Config Example:**
*Remember to use ABSOLUTE paths.*

```json
{
  "mcpServers": {
    "event-matcher": {
        "command": "/absolute/path/to/venv/bin/python",
        "args": ["/absolute/path/to/event-matcher/server.py"]
    }
  }
}
```

### 3. Usage

Restart Claude and ask:

- "Who are the attendees?"
- "Recommend sponsors for Michael Chen."
- "Import attendees from /path/to/data.xlsx" (using local script)

---

## 🛠 Development

### File Structure

- `server.py`: MCP Server entry point.
- `app.py`: Streamlit Dashboard entry point.
- `db/`: SQLite models (for MCP).
- `services/`: Firestore logic (for WebApp).
- `data/templates/`: Example CSV/Excel files for import.

### Running Tests

```bash
pytest
```

---

## 🖥️ Part 2: Streamlit WebApp (Firebase Dashboard)

This component provides a UI to manage events and upload data into Firestore.

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Open your project -> Project Settings -> Service Accounts.
3. **Generate new private key**.
4. Rename the downloaded file to `serviceAccountKey.json`.
5. Move it to the project root directory.

### 2. Run the App

```bash
streamlit run app.py
```

### 3. Using the app

- **Dashboard**: View high-level stats.
- **Manage Events**:
  - **Create**: Setup new events.
  - **Add Data**: Paste JSON or upload Excel/CSV to populate attendees and sponsors.
