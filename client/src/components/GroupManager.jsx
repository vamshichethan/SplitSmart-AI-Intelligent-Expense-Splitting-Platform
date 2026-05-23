import { Plus, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

export function GroupManager({
  groups,
  activeGroupId,
  users,
  onSelectGroup,
  onCreateGroup,
  onAddMember,
  onRemoveMember,
  currentUserId,
  isSaving
}) {
  const [groupForm, setGroupForm] = useState({ name: "", type: "Friends" });
  const [memberForm, setMemberForm] = useState({ mode: "new", userId: users[0]?.id ?? "", name: "", email: "" });
  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const availableUsers = users.filter((user) => !activeGroup?.memberIds.includes(user.id));
  const selectedUserId = availableUsers.some((user) => user.id === memberForm.userId)
    ? memberForm.userId
    : (availableUsers[0]?.id ?? "");
  const canAddExistingMember = memberForm.mode === "existing" && selectedUserId;
  const canAddNewMember = memberForm.mode === "new" && (memberForm.name.trim().length >= 2 || memberForm.email.trim());

  function submitGroup(event) {
    event.preventDefault();
    onCreateGroup(groupForm);
    setGroupForm({ name: "", type: "Friends" });
  }

  function submitMember(event) {
    event.preventDefault();

    if (memberForm.mode === "existing" && selectedUserId) {
      onAddMember({ userId: selectedUserId });
      setMemberForm((current) => ({ ...current, userId: "" }));
      return;
    }

    if (memberForm.mode === "new" && canAddNewMember) {
      onAddMember({
        name: memberForm.name.trim() || undefined,
        email: memberForm.email.trim() || undefined
      });
      setMemberForm((current) => ({ ...current, name: "", email: "" }));
    }
  }

  return (
    <div className="group-manager">
      <div className="group-tabs" aria-label="Groups">
        {groups.map((group) => (
          <button key={group.id} className={group.id === activeGroupId ? "active" : ""} onClick={() => onSelectGroup(group.id)} type="button">
            <span>{group.name}</span>
            <small>{group.members.length} members</small>
          </button>
        ))}
      </div>

      <form className="compact-form" onSubmit={submitGroup}>
        <label>
          Group
          <input
            name="name"
            value={groupForm.name}
            onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          Type
          <select
            name="type"
            value={groupForm.type}
            onChange={(event) => setGroupForm((current) => ({ ...current, type: event.target.value }))}
          >
            <option>Trip</option>
            <option>Home</option>
            <option>Friends</option>
            <option>Subscription</option>
            <option>Event</option>
          </select>
        </label>
        <button className="icon-button" type="submit" aria-label="Create group" disabled={isSaving || !groupForm.name.trim()}>
          <Plus size={18} />
        </button>
      </form>

      <form className="member-form" onSubmit={submitMember}>
        <div className="member-mode" role="group" aria-label="Member source">
          <button
            className={memberForm.mode === "new" ? "active" : ""}
            type="button"
            onClick={() => setMemberForm((current) => ({ ...current, mode: "new" }))}
          >
            New
          </button>
          <button
            className={memberForm.mode === "existing" ? "active" : ""}
            type="button"
            onClick={() => setMemberForm((current) => ({ ...current, mode: "existing" }))}
            disabled={!availableUsers.length}
          >
            Existing
          </button>
        </div>

        {memberForm.mode === "existing" ? (
          <label>
            Add member
            <select
              value={selectedUserId}
              onChange={(event) => setMemberForm((current) => ({ ...current, userId: event.target.value }))}
              disabled={!availableUsers.length}
            >
              {availableUsers.length ? (
                availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))
              ) : (
                <option>All saved users added</option>
              )}
            </select>
          </label>
        ) : (
          <div className="member-fields">
            <label>
              Member name
              <input
                value={memberForm.name}
                onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Aarav Mehta"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={memberForm.email}
                onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="aarav@example.com"
              />
            </label>
          </div>
        )}

        <button className="icon-button" type="submit" aria-label="Add member" disabled={isSaving || (!canAddExistingMember && !canAddNewMember)}>
          <UserPlus size={18} />
        </button>
      </form>

      <div className="member-roster" aria-label="Current members">
        {activeGroup?.members.map((member) => {
          const canRemove = activeGroup.members.length > 1 && member.id !== currentUserId;

          return (
            <article key={member.id}>
              <span>{member.avatar}</span>
              <div>
                <strong>{member.name}</strong>
                <small>{member.email}</small>
              </div>
              <button
                className="icon-button danger"
                type="button"
                onClick={() => onRemoveMember(member.id)}
                aria-label={`Remove ${member.name}`}
                disabled={isSaving || !canRemove}
                title={canRemove ? `Remove ${member.name}` : "Current user or last member cannot be removed"}
              >
                <Trash2 size={16} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
