from firebase_config import get_db
import datetime


class FirestoreService:
    def __init__(self):
        self.db = get_db()
        self.events_ref = self.db.collection("events") if self.db else None

    def add_event(self, event_data):
        """
        Adds a new event to Firestore.
        event_data: dict containing 'name', 'date', etc.
        """
        if not self.db:
            return None

        # Add timestamp
        event_data["created_at"] = datetime.datetime.now()
        event_data["status"] = event_data.get("status", "Upcoming")

        # Add initial counts if not present
        if "attendee_count" not in event_data:
            event_data["attendee_count"] = 0
        if "sponsor_count" not in event_data:
            event_data["sponsor_count"] = 0

        # Add to 'events' collection
        update_time, event_ref = self.events_ref.add(event_data)
        return event_ref.id

    def get_all_events(self):
        """Returns list of all events."""
        if not self.db:
            return []

        docs = self.events_ref.stream()
        events = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            events.append(data)
        return events

    def get_stats(self):
        """Returns dashboard stats."""
        events = self.get_all_events()
        total = len(events)
        upcoming = sum(
            1 for e in events if str(e.get("status")).capitalize() == "Upcoming"
        )
        matched = sum(
            1 for e in events if str(e.get("status")).capitalize() == "Matched"
        )

        # Mocking emails sent for now as it's not tracked yet
        emails_sent = 0

        return {
            "total_events": total,
            "upcoming": upcoming,
            "matched": matched,
            "emails_sent": emails_sent,
        }

    def update_event(self, event_id, update_data):
        """
        Updates an existing event.
        """
        if not self.db:
            return False

        try:
            self.events_ref.document(event_id).update(update_data)
            return True
        except Exception as e:
            print(f"Error updating event: {e}")
            return False
