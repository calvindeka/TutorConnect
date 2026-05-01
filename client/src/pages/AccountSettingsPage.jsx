import { useState, useEffect } from "react";
import { Card, Form, Button, Row, Col, Alert } from "react-bootstrap";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toaster";
import { api, errorMessage } from "../api";

export default function AccountSettingsPage() {
  const { user, refresh } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ first_name: "", last_name: "", profile_image_url: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwError, setPwError] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        profile_image_url: user.profile_image_url || "",
      });
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch("/api/auth/me", {
        first_name: profile.first_name,
        last_name: profile.last_name,
        profile_image_url: profile.profile_image_url || null,
      });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(errorMessage(err, "Could not update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("New password and confirmation do not match");
      return;
    }
    setSavingPw(true);
    try {
      await api.post("/api/auth/password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("Password updated");
    } catch (err) {
      setPwError(errorMessage(err, "Could not change password"));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <h2 className="mb-1">Account Settings</h2>
        <p className="text-muted mb-4">Manage your profile and password.</p>

        <Card className="border-0 tc-card mb-4">
          <Card.Body className="p-4">
            <h5 className="mb-3"><i className="bi bi-person me-2" />Profile</h5>
            <Form onSubmit={saveProfile}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>First name</Form.Label>
                    <Form.Control
                      value={profile.first_name}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Last name</Form.Label>
                    <Form.Control
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control value={user?.email || ""} disabled />
                <Form.Text className="text-muted">Email cannot be changed.</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Profile image URL <span className="text-muted small">(optional)</span></Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://…"
                  value={profile.profile_image_url}
                  onChange={(e) => setProfile({ ...profile, profile_image_url: e.target.value })}
                />
              </Form.Group>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </Form>
          </Card.Body>
        </Card>

        <Card className="border-0 tc-card">
          <Card.Body className="p-4">
            <h5 className="mb-3"><i className="bi bi-lock me-2" />Change password</h5>
            {pwError && <Alert variant="danger" className="py-2">{pwError}</Alert>}
            <Form onSubmit={changePassword}>
              <Form.Group className="mb-3">
                <Form.Label>Current password</Form.Label>
                <Form.Control
                  type="password"
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  required
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>New password</Form.Label>
                    <Form.Control
                      type="password"
                      value={pwForm.new_password}
                      onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm new password</Form.Label>
                    <Form.Control
                      type="password"
                      value={pwForm.confirm_password}
                      onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Button type="submit" disabled={savingPw} variant="primary">
                {savingPw ? "Updating…" : "Update password"}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </Layout>
  );
}
