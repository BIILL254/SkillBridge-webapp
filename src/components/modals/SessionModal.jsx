import ModalShell from "./ModalShell.jsx";
import { useMajiZones } from "../../useMajiZones.js";

/**
 * SessionModal provides a scheduling interface to book a skill exchange session.
 * It contains form fields for selecting the partner user, inputting the skill topic,
 * picking a meeting place, specifying date and time, and picking a session duration.
 *
 * @param {Object} props
 * @param {boolean} props.open - Indicates whether the booking modal is open.
 * @param {function} props.onClose - Callback triggered when the modal is cancelled/closed.
 * @param {Array} props.users - The list of students fetched from the API, used to populate the partner dropdown.
 * @param {string} props.withUser - The selected partner user's name/ID.
 * @param {function} props.setWithUser - State setter to update the selected partner.
 * @param {string} props.skill - The subject or topic of the session.
 * @param {function} props.setSkill - State setter to update the session topic text.
 * @param {string} props.location - The meeting place ("" means an online session).
 * @param {function} props.setLocation - State setter for the meeting place.
 * @param {string} props.date - The selected date string (YYYY-MM-DD format).
 * @param {function} props.setDate - State setter for the date input value.
 * @param {string} props.time - The selected start time string (HH:MM format).
 * @param {function} props.setTime - State setter for the time input value.
 * @param {number} props.dur - Selected session duration in minutes.
 * @param {function} props.setDur - State setter to update the duration.
 * @param {function} props.onBook - Callback triggered when confirming the booking.
 */
export default function SessionModal({
  open,
  onClose,
  users,
  withUser,
  setWithUser,
  skill,
  setSkill,
  location = "",
  setLocation = () => {},
  date,
  setDate,
  time,
  setTime,
  dur,
  setDur,
  onBook,
}) {
  // The places offered are the delivery zones Maji serves, so a group that meets
  // in person can also get water delivered. Loaded only once the form is opened.
  const { zones, loading, error } = useMajiZones(open);
  const places = zones.slice().sort((a, b) => a.localeCompare(b));

  const hint = error
    ? "Maji's list of delivery areas isn't available right now, so only online sessions can be booked."
    : loading
      ? "Loading the areas Maji delivers to…"
      : location
        ? `Maji delivers water to ${location}, so your group can order some for the session.`
        : "Pick a place to meet in person. These are the areas Maji delivers to.";

  return (
    <ModalShell open={open} title="Schedule a session" onClose={onClose}>
      <div className="mo-field">
        <label className="mo-label">Session with</label>
        <select
          className="mo-select"
          value={withUser}
          onChange={(e) => setWithUser(e.target.value)}
        >
          {users.map((u) => (
            <option key={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div className="mo-field">
        <label className="mo-label">Skill topic</label>
        <input
          className="mo-input"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          placeholder="e.g. React Hooks, Spanish basics…"
        />
      </div>
      <div className="mo-field">
        <label className="mo-label">Meeting place</label>
        <select
          className="mo-select"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="">Online (no meeting place)</option>
          {location && !places.includes(location) && (
            <option value={location}>{location}</option>
          )}
          {places.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[var(--sb-text-tertiary)] mt-1.5">
          {hint}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mo-field">
          <label className="mo-label">Date</label>
          <input
            type="date"
            className="mo-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="mo-field">
          <label className="mo-label">Time</label>
          <input
            type="time"
            className="mo-input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <div className="mo-field">
        <label className="mo-label">Duration</label>
        <select
          className="mo-select"
          value={dur}
          onChange={(e) => setDur(parseInt(e.target.value))}
        >
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
        </select>
      </div>

      <div className="mo-actions">
        <button className="mo-cancel" onClick={onClose}>
          Cancel
        </button>
        <button className="mo-confirm" onClick={onBook}>
          Book Session →
        </button>
      </div>
    </ModalShell>
  );
}
