import streamlit as st
import json
import datetime
import pandas as pd
from services.firestore_service import FirestoreService

st.set_page_config(page_title="Manage Events", page_icon="📝")


def parse_json_input(json_str, type_name):
    """Helper to parse and validate JSON input."""
    if not json_str.strip():
        return []
    try:
        data = json.loads(json_str)
        if not isinstance(data, list):
            return f"{type_name} JSON must be a list of objects."
        return data
    except json.JSONDecodeError:
        return f"Invalid JSON format in {type_name} Data."


def parse_file_input(uploaded_file):
    """Helper to parse uploaded CSV/Excel."""
    if not uploaded_file:
        return []
    try:
        if uploaded_file.name.endswith(".csv"):
            df = pd.read_csv(uploaded_file)
        else:
            df = pd.read_excel(uploaded_file)
        return df.to_dict(orient="records")
    except Exception as e:
        return f"Error parsing file: {str(e)}"


def render_manage_events():
    st.title("Manage Events")

    tab1, tab2 = st.tabs(["Create New Event", "Add Data to Existing"])

    service = FirestoreService()
    if not service.db:
        st.error("Firebase not connected. Please add `serviceAccountKey.json`.")

    # --- TAB 1: CREATE NEW EVENT ---
    with tab1:
        st.subheader("Create New Event")

        # Remove st.form to allow dynamic UI updates
        col1, col2 = st.columns(2)
        with col1:
            event_name = st.text_input("Event Name *", placeholder="AI Dev Meetup")
        with col2:
            event_date = st.date_input("Event Date *", value=datetime.date.today())

        st.divider()
        st.caption("Initial Data (Optional)")

        # Input Section
        input_method = st.radio(
            "Input Method", ["Paste JSON", "Upload Files", "Skip"], horizontal=True
        )

        att_data_final = []
        spo_data_final = []
        att_json, spo_json = "", ""
        att_file, spo_file = None, None

        # Dynamic Rendering
        if input_method == "Paste JSON":
            c1, c2 = st.columns(2)
            att_json = c1.text_area("Attendees JSON", height=150)
            spo_json = c2.text_area("Sponsors JSON", height=150)
        elif input_method == "Upload Files":
            c1, c2 = st.columns(2)
            att_file = c1.file_uploader("Attendees File", type=["csv", "xlsx"])
            spo_file = c2.file_uploader("Sponsors File", type=["csv", "xlsx"])

        submitted = st.button("Create Event", type="primary")

        if submitted and service.db:
            if not event_name:
                st.error("Event Name is required.")
            else:
                form_error = None
                # Process Data
                if input_method == "Paste JSON":
                    parsed_att = parse_json_input(att_json, "Attendees")
                    parsed_spo = parse_json_input(spo_json, "Sponsors")

                    if isinstance(parsed_att, str):
                        form_error = parsed_att
                    else:
                        att_data_final = parsed_att

                    if isinstance(parsed_spo, str):
                        form_error = parsed_spo
                    else:
                        spo_data_final = parsed_spo

                elif input_method == "Upload Files":
                    parsed_att = parse_file_input(att_file)
                    parsed_spo = parse_file_input(spo_file)

                    if isinstance(parsed_att, str):
                        form_error = parsed_att
                    else:
                        att_data_final = parsed_att

                    if isinstance(parsed_spo, str):
                        form_error = parsed_spo
                    else:
                        spo_data_final = parsed_spo

                if form_error:
                    st.error(form_error)
                else:
                    # Save
                    payload = {
                        "name": event_name,
                        "date": datetime.datetime.combine(
                            event_date, datetime.time.min
                        ),
                        "status": "Upcoming",
                        "attendee_count": len(att_data_final),
                        "sponsor_count": len(spo_data_final),
                        "raw_attendees": att_data_final,
                        "raw_sponsors": spo_data_final,
                    }
                    try:
                        doc_id = service.add_event(payload)
                        st.success(f"Event created! ID: {doc_id}")
                        # Optional: rerun to clear form or redirect
                    except Exception as e:
                        st.error(f"Error: {e}")

    # --- TAB 2: UPDATE EXISTING ---
    with tab2:
        st.subheader("Add Data to Existing Event")
        events = service.get_all_events()
        if not events:
            st.info("No events found.")
        else:
            event_map = {e["name"]: e for e in events}
            selected_name = st.selectbox("Select Event", options=list(event_map.keys()))
            selected_event = event_map[selected_name]

            st.info(
                f"Current Counts: {selected_event.get('attendee_count', 0)} Attendees, {selected_event.get('sponsor_count', 0)} Sponsors"
            )

            # Remove st.form here too
            input_method_Up = st.radio(
                "Input Method",
                ["Paste JSON", "Upload Files"],
                horizontal=True,
                key="up_method",
            )

            att_json_up, spo_json_up = "", ""
            att_file_up, spo_file_up = None, None

            if input_method_Up == "Paste JSON":
                c1, c2 = st.columns(2)
                att_json_up = c1.text_area(
                    "Add Attendees JSON", height=150, key="up_att_json"
                )
                spo_json_up = c2.text_area(
                    "Add Sponsors JSON", height=150, key="up_spo_json"
                )
            else:
                c1, c2 = st.columns(2)
                att_file_up = c1.file_uploader(
                    "Add Attendees File", type=["csv", "xlsx"], key="up_att_file"
                )
                spo_file_up = c2.file_uploader(
                    "Add Sponsors File", type=["csv", "xlsx"], key="up_spo_file"
                )

            update_submitted = st.button("Import Data", type="primary")

            if update_submitted and service.db:
                new_att = []
                new_spo = []
                up_error = None

                if input_method_Up == "Paste JSON":
                    parsed_att = parse_json_input(att_json_up, "Attendees")
                    parsed_spo = parse_json_input(spo_json_up, "Sponsors")
                    if isinstance(parsed_att, str):
                        up_error = parsed_att
                    else:
                        new_att = parsed_att
                    if isinstance(parsed_spo, str):
                        up_error = parsed_spo
                    else:
                        new_spo = parsed_spo
                else:
                    parsed_att = parse_file_input(att_file_up)
                    parsed_spo = parse_file_input(spo_file_up)
                    if isinstance(parsed_att, str):
                        up_error = parsed_att
                    else:
                        new_att = parsed_att
                    if isinstance(parsed_spo, str):
                        up_error = parsed_spo
                    else:
                        new_spo = parsed_spo

                if up_error:
                    st.error(up_error)
                elif not new_att and not new_spo:
                    st.warning("No data provided.")
                else:
                    current_att = selected_event.get("raw_attendees", [])
                    current_spo = selected_event.get("raw_sponsors", [])

                    updated_att = current_att + new_att
                    updated_spo = current_spo + new_spo

                    update_payload = {
                        "raw_attendees": updated_att,
                        "raw_sponsors": updated_spo,
                        "attendee_count": len(updated_att),
                        "sponsor_count": len(updated_spo),
                    }

                    if service.update_event(selected_event["id"], update_payload):
                        st.success(
                            f"Updated {selected_name}! Added {len(new_att)} attendees, {len(new_spo)} sponsors."
                        )
                    else:
                        st.error("Failed to update event.")


if __name__ == "__main__":
    render_manage_events()
