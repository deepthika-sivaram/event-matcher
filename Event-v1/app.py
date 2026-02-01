import streamlit as st
import pandas as pd
from services.firestore_service import FirestoreService

# Page Config
st.set_page_config(
    page_title="Event Connect",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for styling
st.markdown(
    """
<style>
    .stat-card {
        background-color: #1E232F;
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
        border: 1px solid #2E3440;
    }
    .stat-number {
        font-size: 32px;
        font-weight: bold;
        display: block;
    }
    .stat-label {
        font-size: 14px;
        color: #A0AEC0;
    }
</style>
""",
    unsafe_allow_html=True,
)


def render_dashboard():
    st.title("Dashboard")
    st.caption("Manage your events and attendee matching")

    # Initialize Service
    service = FirestoreService()

    # Check DB Connection
    if not service.db:
        st.warning(
            "Please add `serviceAccountKey.json` to the root directory to connect to Firebase."
        )
        # Mock data for UI demo
        stats = {"total_events": 0, "upcoming": 0, "matched": 0, "emails_sent": 0}
        events = []
    else:
        stats = service.get_stats()
        events = service.get_all_events()

    # --- Stats Row ---
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown(
            f"""
        <div class="stat-card">
            <span class="stat-number">📅 {stats['total_events']}</span>
            <span class="stat-label">Total Events</span>
        </div>
        """,
            unsafe_allow_html=True,
        )

    with col2:
        st.markdown(
            f"""
        <div class="stat-card">
            <span class="stat-number">🎯 {stats['upcoming']}</span>
            <span class="stat-label">Upcoming</span>
        </div>
        """,
            unsafe_allow_html=True,
        )

    with col3:
        st.markdown(
            f"""
        <div class="stat-card">
            <span class="stat-number">✅ {stats['matched']}</span>
            <span class="stat-label">Matched</span>
        </div>
        """,
            unsafe_allow_html=True,
        )

    with col4:
        st.markdown(
            f"""
        <div class="stat-card">
            <span class="stat-number">📧 {stats['emails_sent']}</span>
            <span class="stat-label">Emails Sent</span>
        </div>
        """,
            unsafe_allow_html=True,
        )

    st.markdown("---")

    # --- Upcoming Events Table ---
    col_header_1, col_header_2 = st.columns([3, 1])
    with col_header_1:
        st.subheader("Upcoming Events")
    with col_header_2:
        # Link to Add Event page
        if st.button("➕ Manage Events"):
            st.switch_page("pages/1_Manage_Events.py")

    if not events:
        st.info("No events found. Create one to get started!")
    else:
        # Transform for dataframe
        df_data = []
        for e in events:
            df_data.append(
                {
                    "Event Name": e.get("name"),
                    "Date": str(e.get("date"))[:10] if e.get("date") else "N/A",
                    "Status": e.get("status"),
                    "Attendees": e.get("attendee_count", 0),
                    "Sponsors": e.get("sponsor_count", 0),
                }
            )

        df = pd.DataFrame(df_data)
        st.dataframe(
            df,
            width="stretch",
            hide_index=True,
            column_config={
                "Status": st.column_config.TextColumn(
                    "Status", help="Event Status", validate="^(Upcoming|Matched)$"
                )
            },
        )


if __name__ == "__main__":
    render_dashboard()
