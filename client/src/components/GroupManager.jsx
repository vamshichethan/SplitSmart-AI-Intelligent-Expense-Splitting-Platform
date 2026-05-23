import { Plus, UserPlus } from "lucide-react";
import { useState } from "react";

export function GroupManager({ groups, activeGroupId, users, onSelectGroup, onCreateGroup, onAddMember, isSaving }) {
  const [groupForm, setGroupForm] = useState({ name: "Weekend Trek", type: "Trip" });
  const [memberForm, setMemberForm] = useState({ userId: users[0]?.id ?? "" });
  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const availableUsers = users.filter((user) => !activeGroup?.memberIds.includes(user.id));
  const selectedUserId = availableUsers.some((user) => user.id === memberForm.userId)
    ? memberForm.userId
    : (availableUsers[0]?.id ?? "");

  function submitGroup(event) {
    event.preventDefault();
    onCreateGroup(groupForm);
    setGroupForm({ name: "", type: "Friends" });
  }

  function submitMember(event) {
    event.preventDefault();
    if (selectedUserId) {
      onAddMember({ userId: selectedUserId });
      setMemberForm({ userId: "" });
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

      <form className="compact-form" onSubmit={submitMember}>
        <label>
          Add member
          <select
            value={selectedUserId}
            onChange={(event) => setMemberForm({ userId: event.target.value })}
            disabled={!availableUsers.length}
          >
            {availableUsers.length ? (
              availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))
            ) : (
              <option>All demo users added</option>
            )}
          </select>
        </label>
        <button className="icon-button" type="submit" aria-label="Add member" disabled={isSaving || !availableUsers.length}>
          <UserPlus size={18} />
        </button>
      </form>
    </div>
  );
}
