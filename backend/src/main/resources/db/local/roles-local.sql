-- Local-dev only (referenced solely by application-local.properties).
-- Seeds the role rows that the Postgres Flyway V1 migration would normally insert,
-- since Flyway is disabled under the H2 local profile. Runs after Hibernate creates
-- the schema (spring.jpa.defer-datasource-initialization=true) and before the
-- CommandLineRunner seeders, so DevDataSeeder can resolve roles.
INSERT INTO roles (name) VALUES ('ROLE_PATIENT');
INSERT INTO roles (name) VALUES ('ROLE_DOCTOR');
INSERT INTO roles (name) VALUES ('ROLE_ADMIN');
