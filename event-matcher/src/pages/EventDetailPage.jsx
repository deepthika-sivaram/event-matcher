import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { runMatching } from '../services/gemini';
import './EventDetailPage.css';
import { sendMatchEmail } from '../services/email';

function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [activeTab, setActiveTab] = useState('attendees');
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchResult, setMatchResult] = useState(null);
  const [matching, setMatching] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        navigate('/admin/dashboard');
        return;
      }
      setEvent({ id: eventDoc.id, ...eventDoc.data() });

      const attendeesQuery = query(
        collection(db, 'attendees'),
        where('eventId', '==', eventId)
      );
      const attendeesSnapshot = await getDocs(attendeesQuery);
      setAttendees(attendeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const sponsorsQuery = query(
        collection(db, 'sponsors'),
        where('eventId', '==', eventId)
      );
      const sponsorsSnapshot = await getDocs(sponsorsQuery);
      setSponsors(sponsorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMatching = async (attendee) => {
    setMatching(true);
    setMatchResult(null);

    try {
      const result = await runMatching(attendee, sponsors, event);
      setMatchResult(result);
      setShowModal(true);

      // Save to Firestore with all new fields
      await addDoc(collection(db, 'matches'), {
        eventId,
        attendeeId: attendee.id,
        attendeeName: attendee.name || '',
        attendeeEmail: attendee.email || '',
        attendeeSummary: result.attendeeSummary || '',
        sponsorMatches: result.sponsorMatches || [],
        schedule: result.schedule || [],
        proTips: result.proTips || [],
        afterEvent: result.afterEvent || [],
        emailSubject: result.subject || '',
        emailStatus: 'pending',
        createdAt: new Date()
      });

    } catch (error) {
      console.error('Matching error:', error);
      alert('Error: ' + error.message);
    } finally {
      setMatching(false);
    }
  };

  const handleSelectAttendee = (attendee) => {
    setSelectedAttendee(attendee);
    setMatchResult(null);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSendEmail = async () => {
    if (!selectedAttendee || !matchResult || !event) {
      alert('Missing required data');
      return;
    }
    
    try {
      await sendMatchEmail(selectedAttendee, matchResult, event);
      alert('Email sent!');
      setShowModal(false);
    } catch (err) {
      console.error('Email error:', err);
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="event-detail-container">
        <div className="loading-state">Loading event...</div>
      </div>
    );
  }

  return (
    <div className="event-detail-container">
      {/* Sidebar */}
      <aside className="detail-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">⚡</span>
          <span className="sidebar-title">Event Connect</span>
        </div>
        <nav className="sidebar-nav">
          <a href="/admin/dashboard" className="nav-item">
            <span>📊</span> Dashboard
          </a>
          <a href="/upload" className="nav-item">
            <span>➕</span> Add Event
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="detail-main">
        {/* Header */}
        <div className="detail-header">
          <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
            ← Back
          </button>
          <div className="event-info">
            <h1>{event?.name}</h1>
            <div className="event-meta">
              <span className="meta-item">📅 {event?.date}</span>
              <span className="meta-item">👥 {attendees.length} Attendees</span>
              <span className="meta-item">🏢 {sponsors.length} Sponsors</span>
              <span className={`status-badge status-${event?.status}`}>
                {event?.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'attendees' ? 'active' : ''}`}
              onClick={() => { setActiveTab('attendees'); setSelectedAttendee(null); }}
            >
              Attendees ({attendees.length})
            </button>
            <button
              className={`tab ${activeTab === 'sponsors' ? 'active' : ''}`}
              onClick={() => { setActiveTab('sponsors'); setSelectedAttendee(null); }}
            >
              Sponsors ({sponsors.length})
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {/* List Panel */}
          <div className="list-panel">
            {activeTab === 'attendees' ? (
              attendees.length === 0 ? (
                <div className="empty-state">No attendees found</div>
              ) : (
                <div className="list">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className={`list-item ${selectedAttendee?.id === attendee.id ? 'selected' : ''}`}
                      onClick={() => handleSelectAttendee(attendee)}
                    >
                      <div className="item-avatar">
                        {attendee.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="item-info">
                        <span className="item-name">{attendee.name}</span>
                        <span className="item-subtitle">{attendee.jobTitle} at {attendee.company}</span>
                      </div>
                      <div className="item-arrow">→</div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              sponsors.length === 0 ? (
                <div className="empty-state">No sponsors found</div>
              ) : (
                <div className="list">
                  {sponsors.map((sponsor) => (
                    <div key={sponsor.id} className="list-item sponsor-item">
                      <div className="item-avatar sponsor-avatar">
                        {sponsor.companyName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="item-info">
                        <span className="item-name">{sponsor.companyName}</span>
                        <span className="item-subtitle">{sponsor.domain}</span>
                        <div className="item-tags">
                          {sponsor.promotionType?.map((type, idx) => (
                            <span key={idx} className="tag">{type}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Detail Panel */}
          {selectedAttendee && activeTab === 'attendees' && (
            <div className="detail-panel">
              <div className="panel-header">
                <h2>Attendee Details</h2>
                <button className="close-btn" onClick={() => setSelectedAttendee(null)}>×</button>
              </div>

              <div className="panel-content">
                <div className="profile-header">
                  <div className="profile-avatar">
                    {selectedAttendee.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <h3>{selectedAttendee.name}</h3>
                    <p>{selectedAttendee.jobTitle}</p>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Contact</h4>
                  <div className="detail-row">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{selectedAttendee.email}</span>
                  </div>
                  {selectedAttendee.githubUrl && (
                    <div className="detail-row">
                      <span className="detail-label">GitHub</span>
                      <a href={selectedAttendee.githubUrl} target="_blank" rel="noreferrer" className="detail-link">
                        View Profile
                      </a>
                    </div>
                  )}
                </div>

                <div className="detail-section">
                  <h4>Professional</h4>
                  <div className="detail-row">
                    <span className="detail-label">Company</span>
                    <span className="detail-value">{selectedAttendee.company}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Role</span>
                    <span className="detail-value">{selectedAttendee.jobTitle}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Intent</h4>
                  <div className="intent-tags">
                    {selectedAttendee.intent?.map((intent, idx) => (
                      <span key={idx} className="intent-tag">{intent}</span>
                    ))}
                  </div>
                </div>

                <div className="panel-actions">
                  <button 
                    className="btn-primary match-btn"
                    onClick={() => handleRunMatching(selectedAttendee)}
                    disabled={matching}
                  >
                    {matching ? '⏳ Generating...' : '🤖 Run Matching'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Match Results Modal */}
      {showModal && matchResult && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="modal-icon">🎯</span>
                <div>
                  <h2>Match Results</h2>
                  <p>Personalized recommendations for {selectedAttendee?.name}</p>
                </div>
              </div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              {/* Attendee Summary */}
              {matchResult.attendeeSummary && (
                <div className="modal-section">
                  <h3>👤 About You</h3>
                  <p className="attendee-summary">{matchResult.attendeeSummary}</p>
                </div>
              )}

              {/* Sponsor Matches */}
              <div className="modal-section">
                <h3>🏢 Top Sponsor Matches</h3>
                <div className="sponsor-matches-grid">
                  {matchResult.sponsorMatches?.map((match, idx) => (
                    <div key={idx} className="sponsor-match-card">
                      <div className="match-card-header">
                        <span className="match-rank">#{idx + 1}</span>
                        <span className="match-name">{match.sponsor}</span>
                        <span className="match-score">{match.matchScore}%</span>
                      </div>
                      
                      <div className="match-section">
                        <strong>Why this is a match for you:</strong>
                        <p>{match.whyYou}</p>
                      </div>

                      <div className="match-section">
                        <strong>What you'll gain:</strong>
                        <p>{match.whatYouGain}</p>
                      </div>

                      {match.whoToMeet && (
                        <div className="match-contact">
                          <div className="contact-header">
                            <span>👤</span> 
                            <strong>{match.whoToMeet}</strong>
                            {match.theirRole && <span className="contact-role">({match.theirRole})</span>}
                          </div>
                          {match.whyThisPerson && (
                            <p className="why-person">{match.whyThisPerson}</p>
                          )}
                        </div>
                      )}

                      {match.conversationStarter && (
                        <div className="match-section conversation-starter">
                          <strong>💬 Conversation starter:</strong>
                          <p className="starter-text">"{match.conversationStarter}"</p>
                        </div>
                      )}

                      {match.questionsToAsk?.length > 0 && (
                        <div className="match-section">
                          <strong>❓ Questions to ask:</strong>
                          <ul className="questions-list">
                            {match.questionsToAsk.map((q, qIdx) => (
                              <li key={qIdx}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              {matchResult.schedule?.length > 0 && (
                <div className="modal-section">
                  <h3>📅 Suggested Schedule</h3>
                  <div className="schedule-timeline">
                    {matchResult.schedule.map((item, idx) => (
                      <div key={idx} className="schedule-card">
                        <div className="schedule-time">{item.time}</div>
                        <div className="schedule-details">
                          <div className="schedule-activity">{item.activity}</div>
                          {item.reason && <div className="schedule-reason">{item.reason}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pro Tips */}
              {matchResult.proTips?.length > 0 && (
                <div className="modal-section">
                  <h3>💡 Pro Tips</h3>
                  <ul className="tips-list">
                    {matchResult.proTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* After Event */}
              {matchResult.afterEvent?.length > 0 && (
                <div className="modal-section">
                  <h3>📝 After the Event</h3>
                  <ul className="after-event-list">
                    {matchResult.afterEvent.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Close
              </button>
              <button className="btn-primary" onClick={handleSendEmail}>
                📧 Send Email to {selectedAttendee?.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetailPage;
