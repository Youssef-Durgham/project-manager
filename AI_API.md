# AI API Documentation

Base URL: `http://localhost:3001/api/ai`

## GET Endpoints

### GET /api/ai?action=tasks
Get all ready/in-progress tasks (sorted by priority). Shows blocked status.
Optional: `?project=slug` to filter by project.

### GET /api/ai?action=summary
Get summary of all active projects with progress %.
Optional: `?project=slug` for single project.

### GET /api/ai?action=queue
**Smart Queue** — get the single best next task to work on. Considers priority, due dates, dependencies.

### GET /api/ai?action=velocity&days=30
**Velocity Tracker** — tasks completed per day/week, estimated days to complete.

## POST Endpoints

### POST update-task
```json
{
  "action": "update-task",
  "projectSlug": "auib-ticket-system",
  "taskId": "task-1",
  "status": "in-progress",
  "addNote": "Started working on layout",
  "actualHours": 3
}
```
**Statuses:** ready → in-progress → review → (revision → in-progress again) or (approved → done)

### POST submit-review ⭐ NEW
Submit a task for Yusif's review. Checks acceptance criteria first.
```json
{
  "action": "submit-review",
  "projectSlug": "...",
  "taskId": "task-1",
  "reviewNotes": "All criteria met. Screenshots attached."
}
```

### POST comment
```json
{
  "action": "comment",
  "projectId": "...",
  "taskId": "task-1",
  "text": "Finished implementing the dashboard",
  "images": ["https://s3.../screenshot.png"]
}
```

### POST toggle-criteria
```json
{
  "action": "toggle-criteria",
  "projectSlug": "...",
  "taskId": "task-1",
  "criteriaId": "crit-1"
}
```

### POST link-commit
```json
{
  "action": "link-commit",
  "projectSlug": "...",
  "taskId": "task-1",
  "commitSha": "abc1234",
  "commitMessage": "feat: add dashboard layout",
  "branch": "feature/dashboard"
}
```

### POST add-blocker ⭐ NEW
Raise a blocker, question, or decision-needed item.
```json
{
  "action": "add-blocker",
  "projectId": "...",
  "taskId": "task-1",
  "type": "question",
  "title": "Should we use SSR or CSR for this page?",
  "description": "SSR would be better for SEO but slower dev",
  "priority": "medium"
}
```
Types: `question` | `blocker` | `decision-needed`

### POST add-decision ⭐ NEW
Log an architectural or process decision.
```json
{
  "action": "add-decision",
  "projectId": "...",
  "title": "Use MongoDB instead of DynamoDB",
  "description": "Simpler for prototyping",
  "reasoning": "Faster development, Yusif already familiar with MongoDB",
  "alternatives": ["DynamoDB", "PostgreSQL"],
  "category": "tech-stack",
  "impact": "high"
}
```
Categories: `architecture` | `tech-stack` | `design` | `process` | `business` | `other`

### POST add-screenshot ⭐ NEW
Auto-capture screenshot and attach to task.
```json
{
  "action": "add-screenshot",
  "projectSlug": "...",
  "taskId": "task-1",
  "url": "https://s3.../screenshot.png",
  "caption": "Dashboard after layout complete"
}
```

### POST add-attachment ⭐ NEW
Attach any file to a task.
```json
{
  "action": "add-attachment",
  "projectSlug": "...",
  "taskId": "task-1",
  "name": "requirements.pdf",
  "url": "https://s3.../requirements.pdf",
  "type": "application/pdf",
  "size": 45000
}
```

## Other API Routes

### GET /api/blockers?projectId=xxx&status=open
Get blockers/questions for a project.

### POST/PUT /api/blockers
Create or resolve blockers.

### GET /api/decisions?projectId=xxx
Get decision log for a project.

### GET /api/costs?projectId=xxx
Get costs with summary (monthly, yearly, one-time totals).

### POST /api/costs
Add a cost entry.

### GET /api/insights?projectId=xxx
Time insights — velocity, estimate accuracy, workload by assignee, completion timeline.

### GET /api/summary?projectId=xxx&days=1
Daily auto-summary text + data.

### GET /api/templates
Available project templates.

### GET /api/search?q=...&projectId=xxx
Global search across projects, tasks, and comments.

### GET /api/activity?projectId=xxx&limit=50
Activity log for a project.

## Review Flow
```
waiting → ready → in-progress → review → approved → done
                                   ↓
                               revision → in-progress (loop)
```
- Employee-1 uses `submit-review` when done
- Yusif approves (→ approved/done) or sends back (→ revision)
- `approved` and `done` both count as "complete" in progress %
