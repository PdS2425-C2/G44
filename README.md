# Entities

- user
  {
	- name
	- username
	- pw
  }
- association
  {
    - user_id
    - group_id
    - ts_join_at
  }
- group
  {
	- name
	- group_id
	- ts_created_at
  }
- message
  {
	- ts_sent_at
	- user_id
	- group_id 
	- content
  }

# User Requirements

- Login
  After logging in, the user’s landing page must show the list of group names they belong to, along with a button to create a new group.

- Group Selection
  When the user clicks on a group, the application must display all messages posted after the user joined the group and allow:
  - sending new messages
  - adding users to that group
 
- Leave Group
  The user must be able to leave a group.

# API

