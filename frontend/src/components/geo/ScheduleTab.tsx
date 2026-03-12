import { useState, useEffect } from "react";
import { geoAPI } from "../../services/api";
import { ScanSchedule, AIEngine } from "../../types";

interface Props {
  projectId: string;
  engines: AIEngine[];
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
];

const DEFAULT_FORM = {
  frequency: "DAILY" as "DAILY" | "WEEKLY",
  dayOfWeek: 1,
  timeOfDay: "08:00",
  timezone: "Asia/Ho_Chi_Minh",
  engines: [] as string[],
};

export default function ScheduleTab({ projectId, engines }: Props) {
  const [schedules, setSchedules] = useState<ScanSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  useEffect(() => {
    loadSchedules();
  }, [projectId]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await geoAPI.getSchedules(projectId);
      if (res.data.success) setSchedules(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEngineToggle = (engineId: string) => {
    setForm((f) => ({
      ...f,
      engines: f.engines.includes(engineId)
        ? f.engines.filter((e) => e !== engineId)
        : [...f.engines, engineId],
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.engines.length === 0) {
      alert("Please select at least one AI engine.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        frequency: form.frequency,
        timeOfDay: form.timeOfDay,
        timezone: form.timezone,
        engines: form.engines,
        ...(form.frequency === "WEEKLY" ? { dayOfWeek: form.dayOfWeek } : {}),
      };
      const res = await geoAPI.createSchedule(projectId, payload);
      if (res.data.success) {
        setSchedules((prev) => [...prev, res.data.data]);
        setShowForm(false);
        setForm({ ...DEFAULT_FORM });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (schedule: ScanSchedule) => {
    try {
      const res = await geoAPI.updateSchedule(schedule.id, {
        isActive: !schedule.isActive,
      });
      if (res.data.success) {
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === schedule.id ? { ...s, isActive: !s.isActive } : s,
          ),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const describeSchedule = (s: ScanSchedule) => {
    if (s.frequency === "DAILY") {
      return `Every day at ${s.timeOfDay} (${s.timezone})`;
    }
    const day = DAYS[s.dayOfWeek ?? 1];
    return `Every ${day} at ${s.timeOfDay} (${s.timezone})`;
  };

  const activeCount = schedules.filter((s) => s.isActive).length;

  return (
    <div className="geo-tab">
      <div className="geo-tab-header">
        <div>
          <h3>🗓️ Automated Scan Schedules</h3>
          <p className="schedule-sub">
            Set up recurring scans so GEO data stays up-to-date automatically.
          </p>
        </div>
        <button
          className="btn-create-schedule"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "✕ Cancel" : "+ New Schedule"}
        </button>
      </div>

      {/* Status banner */}
      {schedules.length > 0 && (
        <div className="schedule-banner">
          <span
            className="schedule-banner-dot"
            style={{ background: activeCount > 0 ? "#34d399" : "#4a5568" }}
          />
          {activeCount > 0
            ? `${activeCount} active schedule${activeCount > 1 ? "s" : ""} running`
            : "All schedules paused"}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form className="schedule-form" onSubmit={handleCreate}>
          <h4>Configure New Schedule</h4>

          <div className="form-row">
            <div className="form-field">
              <label>Frequency</label>
              <div className="pill-toggle">
                <button
                  type="button"
                  className={form.frequency === "DAILY" ? "active" : ""}
                  onClick={() => setForm((f) => ({ ...f, frequency: "DAILY" }))}
                >
                  Daily
                </button>
                <button
                  type="button"
                  className={form.frequency === "WEEKLY" ? "active" : ""}
                  onClick={() =>
                    setForm((f) => ({ ...f, frequency: "WEEKLY" }))
                  }
                >
                  Weekly
                </button>
              </div>
            </div>

            {form.frequency === "WEEKLY" && (
              <div className="form-field">
                <label>Day of Week</label>
                <select
                  value={form.dayOfWeek}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dayOfWeek: Number(e.target.value),
                    }))
                  }
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-field">
              <label>Time</label>
              <input
                type="time"
                value={form.timeOfDay}
                onChange={(e) =>
                  setForm((f) => ({ ...f, timeOfDay: e.target.value }))
                }
                required
              />
            </div>

            <div className="form-field">
              <label>Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, timezone: e.target.value }))
                }
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>AI Engines to Scan</label>
            <div className="engine-selector">
              {engines.length === 0 ? (
                <span style={{ color: "#718096", fontSize: "0.85rem" }}>
                  No engines configured yet.
                </span>
              ) : (
                engines.map((eng) => (
                  <label
                    key={eng.id}
                    className={`engine-chip ${form.engines.includes(eng.id) ? "selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.engines.includes(eng.id)}
                      onChange={() => handleEngineToggle(eng.id)}
                    />
                    {eng.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "Saving…" : "💾 Save Schedule"}
            </button>
          </div>
        </form>
      )}

      {/* Schedules list */}
      {loading ? (
        <div className="loading-spinner">Loading…</div>
      ) : schedules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗓️</div>
          <p>
            No schedules yet. Create one to run automated scans daily or weekly.
          </p>
        </div>
      ) : (
        <div className="schedule-list">
          {schedules.map((s) => (
            <div
              key={s.id}
              className={`schedule-card ${s.isActive ? "active" : "paused"}`}
            >
              <div className="schedule-card-left">
                <div className="schedule-freq-badge">
                  {s.frequency === "DAILY" ? "📅 Daily" : "📆 Weekly"}
                </div>
                <div className="schedule-desc">{describeSchedule(s)}</div>
                <div className="schedule-engines">
                  {Array.isArray(s.engines) &&
                    s.engines.map((eid: string) => {
                      const eng = engines.find((e) => e.id === eid);
                      return (
                        <span key={eid} className="engine-badge">
                          {eng?.name ?? eid}
                        </span>
                      );
                    })}
                </div>
              </div>
              <div className="schedule-card-right">
                <label
                  className="toggle-switch"
                  title={s.isActive ? "Pause" : "Activate"}
                >
                  <input
                    type="checkbox"
                    checked={s.isActive}
                    onChange={() => handleToggleActive(s)}
                  />
                  <span className="toggle-slider" />
                </label>
                <span className="schedule-status-label">
                  {s.isActive ? "Active" : "Paused"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
