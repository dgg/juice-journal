-- migrate:up

INSERT INTO vehicles (description)
VALUES ('commuter');

-- migrate:down

DELETE FROM vehicles WHERE description = 'commuter';