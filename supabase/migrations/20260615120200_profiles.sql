create table profiles (
  member_id uuid primary key references members(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  location text not null,
  skills text not null,
  passions text not null,
  heart_project_description text,
  heart_project_seeking boolean not null
);

alter table profiles enable row level security;
