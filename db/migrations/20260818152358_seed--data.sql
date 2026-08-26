-- migrate:up

INSERT INTO vehicles (description)
VALUES ('commuter');

INSERT INTO locations (label, latitude, longitude)
VALUES ('home', 0, 0),
       ('work', 0, 0);

-- migrate:down

DELETE FROM locations WHERE label IN ('home', 'work');
DELETE FROM vehicles WHERE description = 'commuter';