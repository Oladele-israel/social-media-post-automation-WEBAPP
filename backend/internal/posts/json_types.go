// internal/posts/json_types.go
package posts

// ─────────────────────────────────────────────────────────────────
//  WHY THIS FILE EXISTS
// ─────────────────────────────────────────────────────────────────
// PostgreSQL JSONB columns don't map to Go types automatically.
// sqlx (and the underlying database/sql package) only knows how to
// scan simple types: string, int, bool, time.Time, []byte, etc.
//
// To scan JSONB into a Go struct (like Metadata or Platforms),
// we implement two interfaces:
//
//   sql.Scanner      — called when READING  from the DB: Scan(value any)
//   driver.Valuer    — called when WRITING  to  the DB:  Value() (driver.Value, error)
//
// Once these interfaces are on our types, sqlx/database-sql handles
// them transparently — no extra code needed at the call site.
// ─────────────────────────────────────────────────────────────────

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// ── Platforms ([]string backed by JSONB) ──────────────────────────────────

// Value implements driver.Valuer.
// Called by database/sql when you pass a Platforms value as a query argument.
// We marshal it to JSON bytes, which PostgreSQL accepts for a JSONB column.
func (p Platforms) Value() (driver.Value, error) {
	if p == nil {
		return "[]", nil // store empty JSON array, not NULL
	}
	b, err := json.Marshal(p)
	if err != nil {
		return nil, fmt.Errorf("platforms marshal: %w", err)
	}
	return string(b), nil
}

// Scan implements sql.Scanner.
// Called by database/sql when it reads a JSONB column from a result row.
// `src` will be []byte containing the raw JSON.
func (p *Platforms) Scan(src any) error {
	if src == nil {
		*p = Platforms{}
		return nil
	}
	var b []byte
	switch v := src.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("platforms: cannot scan type %T", src)
	}
	return json.Unmarshal(b, p)
}

// ── Metadata (struct backed by JSONB) ────────────────────────────────────

// Value implements driver.Valuer for Metadata.
func (m Metadata) Value() (driver.Value, error) {
	b, err := json.Marshal(m)
	if err != nil {
		return nil, fmt.Errorf("metadata marshal: %w", err)
	}
	return string(b), nil
}

// Scan implements sql.Scanner for Metadata.
func (m *Metadata) Scan(src any) error {
	if src == nil {
		*m = Metadata{}
		return nil
	}
	var b []byte
	switch v := src.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("metadata: cannot scan type %T", src)
	}
	return json.Unmarshal(b, m)
}
