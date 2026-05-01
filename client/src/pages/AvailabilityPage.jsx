import { useEffect, useState } from "react";
import { Card, Button, Form, Row, Col, Alert, Spinner, Table } from "react-bootstrap";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../api";

const DAYS = [
  { v: "mon", l: "Monday" }, { v: "tue", l: "Tuesday" }, { v: "wed", l: "Wednesday" },
  { v: "thu", l: "Thursday" }, { v: "fri", l: "Friday" }, { v: "sat", l: "Saturday" }, { v: "sun", l: "Sunday" },
];

export default function AvailabilityPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState({ day_of_week: "mon", start_time: "14:00", end_time: "16:00" });

  useEffect(() => {
    if (!user?.tutor_profile?.id) {
      setLoading(false);
      return;
    }
    api.get(`/api/availability/${user.tutor_profile.id}`)
      .then((r) => setSlots(r.data.slots.map((s) => ({ ...s, start_time: s.start_time.slice(0,5), end_time: s.end_time.slice(0,5) }))))
      .catch((e) => setError(errorMessage(e, "Failed to load availability")))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Layout><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;

  if (!user?.tutor_profile || user.tutor_profile.status !== "approved") {
    return <Layout>
      <Alert variant="warning">You need an approved tutor profile to set availability. Apply first if you haven't.</Alert>
    </Layout>;
  }

  const addSlot = () => {
    if (draft.start_time >= draft.end_time) {
      setError("End time must be after start time");
      return;
    }
    setSlots([...slots, { ...draft, id: `tmp-${Date.now()}` }]);
    setError("");
  };

  const remove = (id) => setSlots(slots.filter((s) => s.id !== id));

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.put("/api/availability", { slots: slots.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time })) });
      setSlots(data.slots.map((s) => ({ ...s, start_time: s.start_time.slice(0,5), end_time: s.end_time.slice(0,5) })));
      setSuccess("Availability saved!");
    } catch (err) {
      setError(errorMessage(err, "Failed to save availability"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <h2 className="mb-1">My Availability</h2>
        <p className="text-muted mb-4">Set your weekly availability so students can book sessions during the times you're free.</p>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card className="border-0 tc-card mb-4">
          <Card.Body>
            <h6 className="mb-3">Add a slot</h6>
            <Row className="g-2 align-items-end">
              <Col md={4}>
                <Form.Label className="small text-muted">Day</Form.Label>
                <Form.Select value={draft.day_of_week} onChange={(e) => setDraft({ ...draft, day_of_week: e.target.value })}>
                  {DAYS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label className="small text-muted">From</Form.Label>
                <Form.Control type="time" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} />
              </Col>
              <Col md={3}>
                <Form.Label className="small text-muted">To</Form.Label>
                <Form.Control type="time" value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} />
              </Col>
              <Col md={2}>
                <Button onClick={addSlot} className="w-100">
                  <i className="bi bi-plus-lg me-1" />Add
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="border-0 tc-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Current slots ({slots.length})</h6>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
            {slots.length === 0 ? (
              <p className="text-muted small mb-0">No slots yet. Add one above and click "Save changes".</p>
            ) : (
              <Table hover>
                <thead><tr><th>Day</th><th>Start</th><th>End</th><th></th></tr></thead>
                <tbody>
                  {slots.map((s) => (
                    <tr key={s.id}>
                      <td>{DAYS.find((d) => d.v === s.day_of_week)?.l}</td>
                      <td>{s.start_time}</td>
                      <td>{s.end_time}</td>
                      <td className="text-end">
                        <Button size="sm" variant="outline-danger" onClick={() => remove(s.id)}>
                          <i className="bi bi-trash" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </div>
    </Layout>
  );
}
