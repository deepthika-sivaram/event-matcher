import { useState } from 'react';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import './UploadPage.css';

function UploadPage() {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [attendeesJson, setAttendeesJson] = useState('');
  const [sponsorsJson, setSponsorsJson] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateJson = (jsonString, type) => {
    if (!jsonString.trim()) {
      return { valid: false, error: `${type} JSON is required` };
    }
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return { valid: false, error: `${type} must be an array` };
      }
      return { valid: true, data: parsed };
    } catch (err) {
      return { valid: false, error: `Invalid ${type} JSON` };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    const attendeesResult = validateJson(attendeesJson, 'Attendees');
    if (!attendeesResult.valid) {
      setStatus({ type: 'error', message: attendeesResult.error });
      return;
    }

    const sponsorsResult = validateJson(sponsorsJson, 'Sponsors');
    if (!sponsorsResult.valid) {
      setStatus({ type: 'error', message: sponsorsResult.error });
      return;
    }

    setLoading(true);

    try {
      // 1. Create event
      const eventRef = await addDoc(collection(db, 'events'), {
        name: eventName,
        date: eventDate,
        status: 'upcoming',
        attendeeCount: attendeesResult.data.length,
        sponsorCount: sponsorsResult.data.length,
        createdAt: new Date()
      });

      const eventId = eventRef.id;

      // 2. Batch write attendees + sponsors
      const batch = writeBatch(db);

      attendeesResult.data.forEach((attendee) => {
        const ref = doc(collection(db, 'attendees'));
        batch.set(ref, {
          eventId,
          name: attendee.full_name,
          email: attendee.email,
          githubUrl: attendee.github || null,
          linkedIn: attendee.linkedin || null,
          company: attendee.current_company,
          jobTitle: attendee.job_title,
          intent: attendee.what_are_you_hoping_to_get_from_this_event || [],
          createdAt: new Date()
        });
      });

      sponsorsResult.data.forEach((sponsor) => {
        const ref = doc(collection(db, 'sponsors'));
        batch.set(ref, {
          eventId,
          companyName: sponsor.sponsor_name,
          domain: sponsor.company_domain,
          promotionType: sponsor.what_are_they_promoting_at_this_event || [],
          projectName: sponsor.project_or_product_name,
          attendingTeam: sponsor.who_is_attending_from_the_company || [],
          eventPageUrl: sponsor.event_page_url || null,
          createdAt: new Date()
        });
      });

      await batch.commit();

      setStatus({ 
        type: 'success', 
        message: `Event created with ${attendeesResult.data.length} attendees and ${sponsorsResult.data.length} sponsors.`
      });

      setTimeout(() => navigate('/admin/dashboard'), 2000);

    } catch (error) {
      console.error('Error:', error);
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getJsonStatus = (jsonString) => {
    if (!jsonString.trim()) return null;
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) return { valid: true, count: parsed.length };
      return { valid: false };
    } catch {
      return { valid: false };
    }
  };

  const attendeesStatus = getJsonStatus(attendeesJson);
  const sponsorsStatus = getJsonStatus(sponsorsJson);

  return (
    <div className="upload-container">
      <aside className="upload-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">⚡</span>
          <span className="sidebar-title">Event Connect</span>
        </div>
        <nav className="sidebar-nav">
          <a href="/admin/dashboard" className="nav-item">
            <span>📊</span> Dashboard
          </a>
          <a href="/upload" className="nav-item active">
            <span>➕</span> Add Event
          </a>
        </nav>
      </aside>

      <main className="upload-main">
        <div className="upload-header">
          <h1>Create New Event</h1>
          <p>Add event details and paste attendee/sponsor data in JSON format</p>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {status.message && (
            <div className={`status-message ${status.type}`}>
              {status.type === 'success' ? '✓' : '✗'} {status.message}
            </div>
          )}

          <div className="form-section">
            <h2>Event Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Event Name *</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="AI Dev Meetup - January 2026"
                  required
                />
              </div>
              <div className="form-group">
                <label>Event Date *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h2>Attendees Data</h2>
              {attendeesStatus && (
                <span className={`json-status ${attendeesStatus.valid ? 'valid' : 'invalid'}`}>
                  {attendeesStatus.valid ? `✓ ${attendeesStatus.count} attendees` : '✗ Invalid JSON'}
                </span>
              )}
            </div>
            <div className="form-group">
              <label>Paste Attendees JSON *</label>
              <textarea
                value={attendeesJson}
                onChange={(e) => setAttendeesJson(e.target.value)}
                placeholder='[{"full_name": "John", "email": "john@example.com", ...}]'
                rows={10}
                className={attendeesStatus ? (attendeesStatus.valid ? 'valid' : 'invalid') : ''}
                required
              />
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h2>Sponsors Data</h2>
              {sponsorsStatus && (
                <span className={`json-status ${sponsorsStatus.valid ? 'valid' : 'invalid'}`}>
                  {sponsorsStatus.valid ? `✓ ${sponsorsStatus.count} sponsors` : '✗ Invalid JSON'}
                </span>
              )}
            </div>
            <div className="form-group">
              <label>Paste Sponsors JSON *</label>
              <textarea
                value={sponsorsJson}
                onChange={(e) => setSponsorsJson(e.target.value)}
                placeholder='[{"sponsor_name": "TechCorp", "company_domain": "AI", ...}]'
                rows={10}
                className={sponsorsStatus ? (sponsorsStatus.valid ? 'valid' : 'invalid') : ''}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/admin/dashboard')}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || !attendeesStatus?.valid || !sponsorsStatus?.valid}
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default UploadPage;