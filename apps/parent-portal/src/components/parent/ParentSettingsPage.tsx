import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleNotch, Link, Plus, ArrowsClockwise, Trash } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  parentAPI,
  type ParentConnectionRequest,
  type ParentLinkSummary,
  type ParentManualLearner,
  type ParentProfileSettings,
} from '@/lib/api/parent';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_UK_PHONE_PREFIX = '+44 ';
const CONNECTION_REQUESTS_ENABLED = false;
const emptyLearnerForm = {
  display_name: '',
  nickname: '',
  grade_level: '',
  notes: '',
  is_active: true,
};

export const ParentSettingsPage: React.FC = () => {
  const { refreshWorkspaceScope } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ParentProfileSettings>({});
  const [links, setLinks] = useState<ParentLinkSummary[]>([]);
  const [requests, setRequests] = useState<ParentConnectionRequest[]>([]);
  const [manualLearners, setManualLearners] = useState<ParentManualLearner[]>([]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [learnerSubmitting, setLearnerSubmitting] = useState(false);
  const [editingLearnerId, setEditingLearnerId] = useState<string | null>(null);
  const [profileSavedMessage, setProfileSavedMessage] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    student_lookup_value: '',
    requested_relationship_type: '',
    message: '',
  });
  const [learnerForm, setLearnerForm] = useState(emptyLearnerForm);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileResponse, linksResponse, requestsResponse, learnersResponse] = await Promise.all([
        parentAPI.getProfile(),
        parentAPI.getLinks(),
        parentAPI.getConnectionRequests(),
        parentAPI.getManualLearners(),
      ]);
      setProfile(profileResponse.profile || {});
      setLinks(linksResponse.links || []);
      setRequests(requestsResponse.requests || []);
      setManualLearners(learnersResponse.manual_learners || []);
    } catch {
      setError('Failed to load parent settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests],
  );

  const handleSyncAccess = async () => {
    try {
      setSyncing(true);
      await refreshWorkspaceScope();
      await loadData();
    } catch {
      setError('Failed to sync parent access with MST.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true);
      setError(null);
      setProfileSavedMessage(null);
      const response = await parentAPI.updateProfile(profile);
      setProfile(response.profile);
      setProfileSavedMessage('Your profile has been updated.');
    } catch {
      setError('Failed to save parent profile.');
      setProfileSavedMessage(null);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestForm.student_lookup_value.trim()) {
      setError('Student lookup value is required.');
      return;
    }

    try {
      setRequestSubmitting(true);
      setError(null);
      const response = await parentAPI.createConnectionRequest({
        student_lookup_value: requestForm.student_lookup_value.trim(),
        requested_relationship_type: requestForm.requested_relationship_type.trim() || undefined,
        message: requestForm.message.trim() || undefined,
      });
      setRequests((current) => [response.request, ...current]);
      setRequestForm({
        student_lookup_value: '',
        requested_relationship_type: '',
        message: '',
      });
    } catch {
      setError('Failed to create parent connection request.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setError(null);
      const response = await parentAPI.cancelConnectionRequest(requestId);
      setRequests((current) =>
        current.map((request) => (request.id === requestId ? response.request : request)),
      );
    } catch {
      setError('Failed to cancel parent connection request.');
    }
  };

  const startEditLearner = (learner: ParentManualLearner) => {
    setEditingLearnerId(learner.id);
    setLearnerForm({
      display_name: learner.display_name,
      nickname: learner.nickname || '',
      grade_level: learner.grade_level || '',
      notes: learner.notes || '',
      is_active: learner.is_active,
    });
  };

  const resetLearnerForm = () => {
    setEditingLearnerId(null);
    setLearnerForm(emptyLearnerForm);
  };

  const handleSubmitLearner = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!learnerForm.display_name.trim()) {
      setError('Manual learner name is required.');
      return;
    }

    const payload = {
      display_name: learnerForm.display_name.trim(),
      nickname: learnerForm.nickname.trim() || undefined,
      grade_level: learnerForm.grade_level.trim() || undefined,
      notes: learnerForm.notes.trim() || undefined,
      is_active: learnerForm.is_active,
    };

    try {
      setLearnerSubmitting(true);
      setError(null);
      if (editingLearnerId) {
        const response = await parentAPI.updateManualLearner(editingLearnerId, payload);
        setManualLearners((current) =>
          current.map((learner) => (learner.id === editingLearnerId ? response.manual_learner : learner)),
        );
      } else {
        const response = await parentAPI.createManualLearner(payload);
        setManualLearners((current) => [response.manual_learner, ...current]);
      }
      resetLearnerForm();
      await refreshWorkspaceScope();
      await loadData();
    } catch {
      setError('Failed to save manual learner.');
    } finally {
      setLearnerSubmitting(false);
    }
  };

  const handleDeleteLearner = async (learnerId: string) => {
    try {
      setError(null);
      await parentAPI.deleteManualLearner(learnerId);
      setManualLearners((current) => current.filter((learner) => learner.id !== learnerId));
      if (editingLearnerId === learnerId) {
        resetLearnerForm();
      }
      await refreshWorkspaceScope();
      await loadData();
    } catch {
      setError('Failed to delete manual learner.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <CircleNotch size={18} className="animate-spin text-primary" />
          Loading parent settings...
        </CardContent>
      </Card>
    );
  }

  const displayedPhoneValue = profile.phone ?? DEFAULT_UK_PHONE_PREFIX;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parent settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your profile, review approved links, request MST student connections, and maintain manual learners.
          </p>
        </div>
        <Button variant="soft" className="gap-2" onClick={() => void handleSyncAccess()} disabled={syncing}>
          {syncing ? <CircleNotch size={16} className="animate-spin" /> : <ArrowsClockwise size={16} />}
          Refresh connections
        </Button>
      </section>

      {error ? (
        <Card className="border-destructive/30">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Self-service parent contact details used inside the MST parent portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parent-phone">Phone</Label>
              <Input
                id="parent-phone"
                value={displayedPhoneValue}
                onChange={(event) => {
                  setProfileSavedMessage(null);
                  setProfile((current) => ({ ...current, phone: event.target.value }));
                }}
                placeholder="+44 7123 456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-contact-method">Preferred contact method</Label>
              <Input
                id="parent-contact-method"
                value={profile.preferred_contact_method || ''}
                onChange={(event) => {
                  setProfileSavedMessage(null);
                  setProfile((current) => ({ ...current, preferred_contact_method: event.target.value }));
                }}
                placeholder="email, phone, WhatsApp"
              />
            </div>
            <div className="space-y-1">
              <Button onClick={() => void handleSaveProfile()} disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save profile'}
              </Button>
              {profileSavedMessage ? (
                <p className="text-xs text-emerald-600">{profileSavedMessage}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Approved MST links</CardTitle>
            <CardDescription>Admin-approved links to real MST students. Permission flags remain admin-controlled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {links.length > 0 ? (
              links.map((link) => (
                <div key={link.id} className="rounded-xl border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold">{link.student_name}</div>
                    <Badge variant="outline">{link.student_school_id}</Badge>
                    {link.relationship_type ? <Badge variant="secondary">{link.relationship_type}</Badge> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant={link.can_view_quizzes ? 'default' : 'outline'}>Quiz</Badge>
                    <Badge variant={link.can_view_assessments ? 'default' : 'outline'}>Assessment</Badge>
                    <Badge variant={link.can_use_ai_tools_for_child ? 'default' : 'outline'}>AI tools</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No approved MST links yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link size={18} className="text-primary" />
              Connection requests
              <span className="text-xs font-normal text-muted-foreground">(comming soon)</span>
            </CardTitle>
            <CardDescription>
              Request access to real MST students. Admin approval is still required before any child data becomes visible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateRequest} className="space-y-4 rounded-xl border bg-background p-4 opacity-60">
              <div className="space-y-2">
                <Label htmlFor="request-student-lookup">Student lookup value</Label>
                <Input
                  id="request-student-lookup"
                  value={requestForm.student_lookup_value}
                  disabled={!CONNECTION_REQUESTS_ENABLED}
                  onChange={(event) =>
                    setRequestForm((current) => ({ ...current, student_lookup_value: event.target.value }))
                  }
                  placeholder="Student school ID or MST student id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-relationship">Relationship</Label>
                <Input
                  id="request-relationship"
                  value={requestForm.requested_relationship_type}
                  disabled={!CONNECTION_REQUESTS_ENABLED}
                  onChange={(event) =>
                    setRequestForm((current) => ({ ...current, requested_relationship_type: event.target.value }))
                  }
                  placeholder="mother, father, guardian"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-message">Message</Label>
                <Textarea
                  id="request-message"
                  value={requestForm.message}
                  disabled={!CONNECTION_REQUESTS_ENABLED}
                  onChange={(event) => setRequestForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Optional note for admin review"
                />
              </div>
              <Button type="submit" disabled={!CONNECTION_REQUESTS_ENABLED || requestSubmitting}>
                {requestSubmitting ? 'Submitting...' : 'Submit request'}
              </Button>
            </form>

            <div className="space-y-3">
              {requests.length > 0 ? (
                requests.map((request) => (
                  <div key={request.id} className="rounded-xl border bg-background p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{request.student_lookup_value}</div>
                      <Badge variant="outline">{request.status}</Badge>
                      {request.requested_relationship_type ? (
                        <Badge variant="secondary">{request.requested_relationship_type}</Badge>
                      ) : null}
                    </div>
                    {request.message ? (
                      <p className="mt-2 text-sm text-muted-foreground">{request.message}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Created {new Date(request.created_at).toLocaleString()}</span>
                      {request.status === 'pending' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-destructive hover:bg-transparent"
                          onClick={() => void handleCancelRequest(request.id)}
                        >
                          Cancel request
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No connection requests yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus size={18} className="text-primary" />
              Manual learners
            </CardTitle>
            <CardDescription>
              Add learners who are not in MST. These stay private to your parent account and still support AI workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmitLearner} className="space-y-4 rounded-xl border bg-background p-4">
              <div className="space-y-2">
                <Label htmlFor="learner-name">Display name</Label>
                <Input
                  id="learner-name"
                  value={learnerForm.display_name}
                  onChange={(event) => setLearnerForm((current) => ({ ...current, display_name: event.target.value }))}
                  placeholder="Learner name"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="learner-nickname">Nickname</Label>
                  <Input
                    id="learner-nickname"
                    value={learnerForm.nickname}
                    onChange={(event) => setLearnerForm((current) => ({ ...current, nickname: event.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="learner-grade">Grade level</Label>
                  <Input
                    id="learner-grade"
                    value={learnerForm.grade_level}
                    onChange={(event) => setLearnerForm((current) => ({ ...current, grade_level: event.target.value }))}
                    placeholder="e.g. Grade 4"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="learner-notes">Notes</Label>
                <Textarea
                  id="learner-notes"
                  value={learnerForm.notes}
                  onChange={(event) => setLearnerForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Private family notes"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={learnerForm.is_active}
                    onChange={(event) => setLearnerForm((current) => ({ ...current, is_active: event.target.checked }))}
                  />
                  Active learner
                </label>
                <div className="flex gap-2">
                  {editingLearnerId ? (
                    <Button type="button" variant="soft" onClick={resetLearnerForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                  <Button type="submit" disabled={learnerSubmitting}>
                    {learnerSubmitting ? 'Saving...' : editingLearnerId ? 'Save learner' : 'Add learner'}
                  </Button>
                </div>
              </div>
            </form>

            <div className="space-y-3">
              {manualLearners.length > 0 ? (
                manualLearners.map((learner) => (
                  <div key={learner.id} className="rounded-xl border bg-background p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold">{learner.display_name}</div>
                          <Badge variant={learner.is_active ? 'default' : 'outline'}>
                            {learner.is_active ? 'active' : 'inactive'}
                          </Badge>
                          {learner.grade_level ? <Badge variant="outline">{learner.grade_level}</Badge> : null}
                        </div>
                        {learner.nickname ? (
                          <div className="mt-1 text-sm text-muted-foreground">Nickname: {learner.nickname}</div>
                        ) : null}
                        {learner.notes ? (
                          <div className="mt-2 text-sm text-muted-foreground">{learner.notes}</div>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="soft" size="sm" onClick={() => startEditLearner(learner)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void handleDeleteLearner(learner.id)}
                        >
                          <Trash size={14} />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No manual learners yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {pendingRequests.length > 0 ? (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
            <CardDescription>
              Requests stay pending until an MST admin approves or rejects them. Reload or use Refresh connections to
              pick up approval changes made in another session.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {pendingRequests.length} pending request{pendingRequests.length === 1 ? '' : 's'}.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
