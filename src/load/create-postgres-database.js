/************************************************
 * Creates the postgresql database to store
 * OER materials, user activities and other
 * data used in the platform.
 */

/////////////////////////////////////////////////
// Modules and configurations
/////////////////////////////////////////////////

// external modules
const async = require('async');

// configuration data
const config = require('@config/config');

// postgresql connection to the database
const pg = require('@lib/postgresQL')(config.pg);


/////////////////////////////////////////////////
// Script parameters
/////////////////////////////////////////////////

// get schema
const schema  = config.pg.schema;

// Statement for checking if the provided schema exists
const schemaExistsString = `
    SELECT exists(
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = '${schema}')
    AS schema_exists;
`;

// Statement for creating the provided schema
const createSchemaString = `CREATE schema ${schema};`;

// Statement for retrieving the current database version
const checkVersion = `SELECT version FROM ${schema}.database_version`;

// Statement for checking if the tables exist
const tablesExistString = `
    SELECT *
    FROM information_schema.tables
    WHERE table_schema = '${schema}'
`;

/**
 * @description An object containing the schematics of the non-updated database.
 * @type {Object} database.tables
 * @property {String} oer_materials - The statement to create the table
 * containing basic OER material information.
 * @property {String} materials_contents - The statement to create the table
 * containing extracted OER material information via services.
 * @property {String} episodes - The statement to create the table containing if
 * an OER material is an episode of some sequence of lectures.
 * @property {String} series - The statement to create the table containing
 * series information.
 * @property {String} urls - The statement to create the table connecting the
 * `oer_materials`, `providers` and `contains` tables.
 * @property {String} providers - The statement to create the table containing
 * provider information.
 * @property {String} contains - The statement to create a link between the
 * provider url and material url.
 * @property {String} features_public - The statement to create a table
 * containing public features used in different services.
 * @property {String} features_private - The statement to create a table
 * containing private features used in different services.
 * @property {String} user_activities - The table for storing user activity
 * data.
 * @property {String} cookies - The table containing the cookie information
 * of different users.
 * @property {String} database_version - The table containing information about
 * the current version of the database.
 */
const dbCreates = {

    oer_materials:
        `CREATE TABLE ${schema}.oer_materials (
            id              serial PRIMARY KEY,
            title           varchar NOT NULL,
            description     varchar,
            authors         varchar (1000) ARRAY,
            language        char (2) NOT NULL,
            creation_date   timestamp with time zone,
            retrieved_date  timestamp with time zone DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL,
            type            varchar (10) NOT NULL,
            mimetype        varchar (100) NOT NULL,
            license         varchar
        );

        ALTER TABLE ${schema}.oer_materials
            OWNER TO ${config.pg.user};

        CREATE INDEX oer_materials_id
            ON ${schema}.oer_materials(id);

        CREATE INDEX oer_materials_authors
            ON ${schema}.oer_materials USING GIN(authors);

        CREATE INDEX oer_materials_language
            ON ${schema}.oer_materials(language);

        CREATE INDEX oer_materials_type
            ON ${schema}.oer_materials(type);



        COMMENT ON TABLE ${schema}.oer_materials
            IS 'The open educational resources table';

        COMMENT ON COLUMN ${schema}.oer_materials.id
            IS 'The material ID';

        COMMENT ON COLUMN ${schema}.oer_materials.title
            IS 'The material title';

        COMMENT ON COLUMN ${schema}.oer_materials.description
            IS 'A short description about the material';

        COMMENT ON COLUMN ${schema}.oer_materials.authors
            IS 'The authors associated with the material';

        COMMENT ON COLUMN ${schema}.oer_materials.language
            IS 'The language in which the material is presented';

        COMMENT ON COLUMN ${schema}.oer_materials.creation_date
            IS 'When the material was created';

        COMMENT ON COLUMN ${schema}.oer_materials.retrieved_date
            IS 'When was the the material retrieved';

        COMMENT ON COLUMN ${schema}.oer_materials.type
            IS 'The material type (short)';

        COMMENT ON COLUMN ${schema}.oer_materials.mimetype
            IS 'The full material mimetype';

        COMMENT ON COLUMN ${schema}.oer_materials.license
            IS 'The license of the material';`,


    oer_materials_partial:
        `CREATE TABLE ${schema}.oer_materials_partial (
            id              serial PRIMARY KEY,
            title           varchar,
            description     varchar,
            provideruri     varchar,
            materialurl     varchar UNIQUE,
            authors         varchar (1000) ARRAY,
            language        varchar,
            datecreated     timestamp with time zone,
            dateretrieved   timestamp with time zone DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL,
            type             jsonb,
            materialmetadata jsonb,
            license         varchar,
            message         varchar
        );

    ALTER TABLE ${schema}.oer_materials_partial
        OWNER TO ${config.pg.user};

    CREATE INDEX oer_materials_partial_id
        ON ${schema}.oer_materials_partial(id);

    CREATE INDEX oer_materials_partial_materialurl
        ON ${schema}.oer_materials_partial(materialurl);

    CREATE INDEX oer_materials_partial_language
        ON ${schema}.oer_materials_partial(language);

    CREATE INDEX oer_materials_partial_type
        ON ${schema}.oer_materials_partial(type);



    COMMENT ON TABLE ${schema}.oer_materials_partial
        IS 'The table containing partial open educational resources; not completely processed';`,


    material_contents:
        `CREATE TABLE ${schema}.material_contents (
            id              serial,
            language        char (2) NOT NULL,
            type            varchar (40) NOT NULL,
            extension       varchar (20),
            value           jsonb NOT NULL,

            material_id     integer NOT NULL,

            PRIMARY KEY (material_id, language, type, extension),
            FOREIGN KEY (material_id) REFERENCES ${schema}.oer_materials(id) ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.material_contents
            OWNER TO ${config.pg.user};

        CREATE INDEX material_contents_language
            ON ${schema}.material_contents(language);

        CREATE INDEX material_contents_type
            ON ${schema}.material_contents(type);

        CREATE INDEX material_contents_extension
            ON ${schema}.material_contents(extension);



        COMMENT ON TABLE ${schema}.material_contents
            IS 'The table containing open educational resources content';

        COMMENT ON COLUMN ${schema}.material_contents.language
            IS 'The language in which the content is present';

        COMMENT ON COLUMN ${schema}.material_contents.type
            IS 'The content type';

        COMMENT ON COLUMN ${schema}.material_contents.extension
            IS 'The content extension';

        COMMENT ON COLUMN ${schema}.material_contents.value
            IS 'The body of the content; The value is stored under the "value" attribute';

        COMMENT ON COLUMN ${schema}.material_contents.material_id
            IS 'The id of the associated record in the oer_materials table';`,


    series:
        `CREATE TABLE ${schema}.series (
            id              serial PRIMARY KEY,
            title           varchar NOT NULL,
            description     varchar,
            type            varchar (100) NOT NULL
        );

        ALTER TABLE ${schema}.series
            OWNER TO ${config.pg.user};

        CREATE INDEX series_id
            ON ${schema}.series(id);

        CREATE INDEX series_type
            ON ${schema}.series(type);`,


    episodes:
        `CREATE TABLE ${schema}.episodes (
            episode_number  integer NOT NULL,

            material_id     integer NOT NULL,
            series_id       integer NOT NULL,

            PRIMARY KEY (material_id, series_id),
            FOREIGN KEY (material_id) REFERENCES ${schema}.oer_materials(id) ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (series_id)   REFERENCES ${schema}.series(id)        ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.episodes
            OWNER TO ${config.pg.user};

        CREATE INDEX episodes_material_id
            ON ${schema}.episodes(material_id);

        CREATE INDEX episodes_series_id
            ON ${schema}.episodes(series_id);`,


    providers:
        `CREATE TABLE ${schema}.providers (
            id          serial PRIMARY KEY NOT NULL,
            token       varchar (20) UNIQUE,
            name        varchar NOT NULL,
            domain      varchar UNIQUE NOT NULL,
            contact     varchar
        );

        ALTER TABLE ${schema}.providers
            OWNER TO ${config.pg.user};

        CREATE INDEX providers_id
            ON ${schema}.providers(id);

        CREATE INDEX providers_token
            ON ${schema}.providers(token);

        CREATE INDEX providers_name
            ON ${schema}.providers(name);

        CREATE INDEX providers_domain
            ON ${schema}.providers(domain);



        CREATE FUNCTION map_providers_with_urls()
        RETURNS TRIGGER AS $$
        BEGIN
            UPDATE urls SET provider_id=NEW.id WHERE LOWER(urls.url) LIKE '%' || LOWER(NEW.domain) || '%';
            RETURN NULL;
        END
        $$ LANGUAGE 'plpgsql';

        CREATE TRIGGER  update_url_with_provider
            AFTER INSERT ON ${schema}.providers
            FOR EACH ROW
            EXECUTE PROCEDURE map_providers_with_urls();



        COMMENT ON TABLE ${schema}.providers
            IS 'The table containing the providers of OER material';

        COMMENT ON COLUMN ${schema}.providers.id
            IS 'The provider ID';

        COMMENT ON COLUMN ${schema}.providers.token
            IS 'The token associated with the provider';

        COMMENT ON COLUMN ${schema}.providers.name
            IS 'The provider name';

        COMMENT ON COLUMN ${schema}.providers.domain
            IS 'The provider domain; where the providers repository is found';

        COMMENT ON COLUMN ${schema}.providers.contact
            IS 'The contact associated with the OER provider; the lead maintainer';`,


    urls:
        `CREATE TABLE ${schema}.urls (
            id          serial PRIMARY KEY,
            url         varchar UNIQUE NOT NULL,

            provider_id    integer,
            material_id    integer,

            FOREIGN KEY (provider_id) REFERENCES ${schema}.providers(id)     ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES ${schema}.oer_materials(id) ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.urls
            OWNER TO ${config.pg.user};

        CREATE INDEX urls_url
            ON ${schema}.urls(url);

        CREATE INDEX urls_provider_token
            ON ${schema}.urls(material_id);

        CREATE INDEX urls_material_id
            ON ${schema}.urls(material_id);



        CREATE FUNCTION set_provider_reference()
        RETURNS TRIGGER AS $$
        DECLARE
            provider_id integer;
        BEGIN

            SELECT id INTO provider_id FROM providers WHERE LOWER(NEW.url) LIKE '%' || LOWER(providers.domain) || '%';

            IF NEW.provider_id IS NULL AND provider_id IS NOT NULL THEN
                NEW.provider_id := provider_id;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE 'plpgsql';

        CREATE TRIGGER  update_url_with_provider
            BEFORE INSERT ON ${schema}.urls
            FOR EACH ROW
            EXECUTE PROCEDURE set_provider_reference('${schema}.urls');



        COMMENT ON TABLE ${schema}.urls
            IS 'The table containing all urls that were collected through the materials or user activities';

        COMMENT ON COLUMN ${schema}.urls.id
            IS 'The urls id';

        COMMENT ON COLUMN ${schema}.urls.url
            IS 'The actual url address';

        COMMENT ON COLUMN ${schema}.urls.provider_id
            IS 'The id to the associated record in the providers table';

        COMMENT ON COLUMN ${schema}.urls.material_id
            IS 'The id to the associated record in the oer_materials table';`,


    contains:
        `CREATE TABLE ${schema}.contains (
            container_id    integer NOT NULL,
            contains_id     integer NOT NULL,

            PRIMARY KEY (container_id, contains_id),
            FOREIGN KEY (container_id) REFERENCES ${schema}.urls(id) ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (contains_id)  REFERENCES ${schema}.urls(id) ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.contains
            OWNER TO ${config.pg.user};

        CREATE INDEX contains_container_id
            ON ${schema}.contains(container_id);

        CREATE INDEX contains_contains_id
            ON ${schema}.contains(contains_id);



        CREATE FUNCTION set_provider_contains_id()
        RETURNS TRIGGER AS $$
        DECLARE
            contains_provider_id integer;
            container_provider_id integer;
        BEGIN
            SELECT provider_id INTO contains_provider_id  FROM urls WHERE id=NEW.contains_id  AND provider_id IS NOT NULL;
            SELECT provider_id INTO container_provider_id FROM urls WHERE id=NEW.container_id AND provider_id IS NOT NULL;

            IF contains_provider_id IS NULL AND container_provider_id IS NOT NULL THEN
                UPDATE urls SET provider_id=container_provider_id WHERE id=NEW.contains_id;
            END IF;

            RETURN NULL;
        END;
        $$ LANGUAGE 'plpgsql';

        CREATE TRIGGER update_provider_of_contains_id
            AFTER INSERT OR UPDATE ON ${schema}.contains
            FOR EACH ROW
            EXECUTE PROCEDURE set_provider_contains_id();



        COMMENT ON TABLE ${schema}.contains
            IS 'The table containing information the url structure';

        COMMENT ON COLUMN ${schema}.contains.container_id
            IS 'The id of the associated record in the urls table that serves as the the container';

        COMMENT ON COLUMN ${schema}.contains.contains_id
            IS 'The id of the associated record in the urls table that is found inside the container';`,


    cookies:
        `CREATE TABLE ${schema}.cookies (
            id          serial PRIMARY KEY,
            uuid        varchar UNIQUE NOT NULL,
            user_agent  varchar NOT NULL,
            language    varchar NOT NULL
        );

        ALTER TABLE ${schema}.cookies
            OWNER TO ${config.pg.user};

        CREATE INDEX cookie_id
            ON ${schema}.cookies(id);

        CREATE INDEX cookie_uuid
            ON ${schema}.cookies(uuid);

        CREATE INDEX cookie_language
            ON ${schema}.cookies(language);



        COMMENT ON TABLE ${schema}.cookies
            IS 'The table containing cookie information';

        COMMENT ON COLUMN ${schema}.cookies.id
            IS 'The id of the cookie';

        COMMENT ON COLUMN ${schema}.cookies.uuid
            IS 'The randomly created user id stored in the cookie';

        COMMENT ON COLUMN ${schema}.cookies.user_agent
            IS 'The user agent associated with the cookie';

        COMMENT ON COLUMN ${schema}.cookies.language
            IS 'The language configuration of the browser associated with the cookie';`,


    user_activities:
        `CREATE TABLE ${schema}.user_activities (
            id          serial PRIMARY KEY,
            timestamp   timestamp with time zone NOT NULL,
            referrer_url varchar NOT NULL,

            cookie_id   integer NOT NULL,
            url_id      integer NOT NULL,

            FOREIGN KEY (cookie_id) REFERENCES ${schema}.cookies(id) ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (url_id)    REFERENCES ${schema}.urls(id)    ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.user_activities
            OWNER TO ${config.pg.user};

        CREATE INDEX user_activity_id
            ON ${schema}.user_activities(id);

        CREATE INDEX user_activity_cookie_id
            ON ${schema}.user_activities(cookie_id);

        CREATE INDEX user_activity_url_id
            ON ${schema}.user_activities(url_id);



        COMMENT ON TABLE ${schema}.user_activities
            IS 'The table containing user activity information';

        COMMENT ON COLUMN ${schema}.user_activities.id
            IS 'The id of the user activity record';

        COMMENT ON COLUMN ${schema}.user_activities.timestamp
            IS 'The time of when the user activity happened';

        COMMENT ON COLUMN ${schema}.user_activities.referrer_url
            IS 'The referrer url; from where the user came from';

        COMMENT ON COLUMN ${schema}.user_activities.cookie_id
            IS 'The id of the associated record in the cookies table';

        COMMENT ON COLUMN ${schema}.user_activities.url_id
            IS 'The id to the associated record in the urls table';`,


    features_public:
        `CREATE TABLE ${schema}.features_public (
            id          serial PRIMARY KEY,
            name        varchar (500) NOT NULL,
            value       jsonb NOT NULL,

            qa_required bool DEFAULT FALSE,
            la_required bool DEFAULT FALSE,
            re_required bool DEFAULT FALSE,

            record_id   integer NOT NULL,
            table_name  varchar NOT NULL
        );

        ALTER TABLE ${schema}.features_public
            OWNER TO ${config.pg.user};

        CREATE INDEX features_public_id
            ON ${schema}.features_public(id);

        CREATE INDEX features_public_name
            ON ${schema}.features_public(name);

        CREATE INDEX features_public_qa_required
            ON ${schema}.features_public(qa_required);

        CREATE INDEX features_public_la_required
            ON ${schema}.features_public(la_required);

        CREATE INDEX features_public_re_required
            ON ${schema}.features_public(re_required);

        CREATE INDEX features_public_record_id
            ON ${schema}.features_public(record_id);



        COMMENT ON TABLE ${schema}.features_public
            IS 'The public features used in the analysis';

        COMMENT ON COLUMN ${schema}.features_public.id
            IS 'The id of the public features';

        COMMENT ON COLUMN ${schema}.features_public.name
            IS 'The name of the public feature';

        COMMENT ON COLUMN ${schema}.features_public.value
            IS 'The value of the public feature';

        COMMENT ON COLUMN ${schema}.features_public.qa_required
            IS 'The indicator if the feature is used in the quality assurance';

        COMMENT ON COLUMN ${schema}.features_public.la_required
            IS 'The indicator if the feature is used in the learning analytics';

        COMMENT ON COLUMN ${schema}.features_public.re_required
            IS 'The indicator if the feature is used in the recommender engine';

        COMMENT ON COLUMN ${schema}.features_public.record_id
            IS 'The id of the record to which the feature is assocated with';

        COMMENT ON COLUMN ${schema}.features_public.table_name
            IS 'The name of the table in which the record associated to the feature is stored';`,


    features_private:
        `CREATE TABLE ${schema}.features_private (
            id          serial PRIMARY KEY,
            name        varchar (500) NOT NULL,
            value       jsonb NOT NULL,

            qa_required bool DEFAULT FALSE,
            la_required bool DEFAULT FALSE,
            re_required bool DEFAULT FALSE,

            record_id   integer NOT NULL,
            table_name  varchar NOT NULL
        );

        ALTER TABLE ${schema}.features_private
            OWNER TO ${config.pg.user};

        CREATE INDEX features_private_id
            ON ${schema}.features_private(id);

        CREATE INDEX features_private_name
            ON ${schema}.features_private(name);

        CREATE INDEX features_private_qa_required
            ON ${schema}.features_private(qa_required);

        CREATE INDEX features_private_la_required
            ON ${schema}.features_private(la_required);

        CREATE INDEX features_private_re_required
            ON ${schema}.features_private(re_required);

        CREATE INDEX features_private_record_id
            ON ${schema}.features_private(record_id);



        COMMENT ON TABLE ${schema}.features_private
            IS 'The private features used in the analysis';

        COMMENT ON COLUMN ${schema}.features_private.id
            IS 'The id of the private features';

        COMMENT ON COLUMN ${schema}.features_private.name
            IS 'The name of the private feature';

        COMMENT ON COLUMN ${schema}.features_private.value
            IS 'The value of the private feature';

        COMMENT ON COLUMN ${schema}.features_private.qa_required
            IS 'The indicator if the feature is used in the quality assurance';

        COMMENT ON COLUMN ${schema}.features_private.la_required
            IS 'The indicator if the feature is used in the learning analytics';

        COMMENT ON COLUMN ${schema}.features_private.re_required
            IS 'The indicator if the feature is used in the recommender engine';

        COMMENT ON COLUMN ${schema}.features_private.record_id
            IS 'The id of the record to which the feature is assocated with';

        COMMENT ON COLUMN ${schema}.features_private.table_name
            IS 'The name of the table in which the record associated to the feature is stored';`,


    rec_sys_material_model:
        `CREATE TABLE ${schema}.rec_sys_material_model (
            id           serial PRIMARY KEY,
            provider_uri varchar UNIQUE NOT NULL,
            provider     varchar,
            title        varchar,
            description  varchar,
            language     varchar,
            type         varchar,
            concepts     jsonb,

            provider_id  integer,
            url_id       integer,

            FOREIGN KEY (provider_id) REFERENCES ${schema}.providers(id) ON DELETE CASCADE,
            FOREIGN KEY (url_id)      REFERENCES ${schema}.urls(id)      ON DELETE CASCADE ON UPDATE CASCADE
        );

        ALTER TABLE ${schema}.rec_sys_material_model
            OWNER TO ${config.pg.user};

        CREATE INDEX rec_sys_material_model_provider_uri
            ON ${schema}.rec_sys_material_model(provider_uri);

        CREATE INDEX rec_sys_material_model_provider_id
            ON ${schema}.rec_sys_material_model(provider_id);

        CREATE INDEX rec_sys_material_model_url_id
            ON ${schema}.rec_sys_material_model(url_id);



        CREATE FUNCTION set_url_and_provider_id()
        RETURNS TRIGGER AS $$
        DECLARE
            url_id      integer;
            provider_id integer;
        BEGIN

            SELECT id INTO url_id FROM urls WHERE LOWER(NEW.provider_uri)=LOWER(urls.url);

            IF NEW.url_id IS NULL AND url_id IS NOT NULL THEN
                NEW.url_id := url_id;
            END IF;

            SELECT urls.provider_id INTO provider_id FROM urls WHERE id=NEW.url_id;

            IF NEW.provider_id IS NULL AND provider_id IS NOT NULL THEN
                NEW.provider_id := provider_id;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE 'plpgsql';

        CREATE TRIGGER update_rec_sys_material_model_keys
            BEFORE INSERT OR UPDATE ON ${schema}.rec_sys_material_model
            FOR EACH ROW
            EXECUTE PROCEDURE set_url_and_provider_id();



        COMMENT ON TABLE ${schema}.rec_sys_material_model
            IS 'The table containing the material models';

        COMMENT ON COLUMN ${schema}.rec_sys_material_model.id
            IS 'The id of the material model';

        COMMENT ON COLUMN ${schema}.rec_sys_material_model.provider_uri
            IS 'The url associated with the material model';

        COMMENT ON COLUMN ${schema}.rec_sys_material_model.title
            IS 'The title of the material model';

        COMMENT ON COLUMN ${schema}.rec_sys_material_model.description
            IS 'The description of the material model';

        COMMENT ON COLUMN ${schema}.rec_sys_material_model.language
            IS 'The language(s) of the material model';

        COMMENT ON COLUMN ${schema}.rec_sys_material_model.type
            IS 'The type(s) of materials in the model';

        COMMENT ON COLUMN ${schema}.rec_sys_material_model.concepts
            IS 'The wikipedia concepts describing the model';

        COMMENT ON COLUMN ${schema}.rec_sys_material_model.provider_id
            IS 'The id of the assocaited record in providers table';

        COMMENT ON COLUMN ${schema}.rec_sys_material_model.url_id
            IS 'The id of the associated record in the urls table';`,


    rec_sys_user_model:
        `CREATE TABLE ${schema}.rec_sys_user_model (
            id       serial PRIMARY KEY,
            uuid     varchar UNIQUE NOT NULL,
            visited  jsonb,
            language jsonb,
            type     jsonb,
            concepts jsonb,

            cookie_id integer NOT NULL,

            FOREIGN KEY (cookie_id) REFERENCES ${schema}.cookies(id) ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.rec_sys_user_model
            OWNER TO ${config.pg.user};

        CREATE INDEX rec_sys_user_model_uuid
            ON ${schema}.rec_sys_user_model(uuid);

        CREATE INDEX rec_sys_user_model_cookie_id
            ON ${schema}.rec_sys_user_model(cookie_id);



        CREATE FUNCTION set_cookie_id()
        RETURNS TRIGGER AS $$
        DECLARE
            cookie_id integer;
        BEGIN

            SELECT id INTO cookie_id FROM cookies WHERE LOWER(NEW.uuid)=LOWER(cookies.uuid);

            IF NEW.cookie_id IS NULL AND cookie_id IS NOT NULL THEN
                NEW.cookie_id := cookie_id;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE 'plpgsql';

        CREATE TRIGGER update_rec_sys_user_model_keys
            BEFORE INSERT OR UPDATE ON ${schema}.rec_sys_user_model
            FOR EACH ROW
            EXECUTE PROCEDURE set_cookie_id();



        COMMENT ON TABLE ${schema}.rec_sys_user_model
            IS 'The table containing the user models';

        COMMENT ON COLUMN ${schema}.rec_sys_user_model.id
            IS 'The id of the user model';

        COMMENT ON COLUMN ${schema}.rec_sys_user_model.uuid
            IS 'The user token associated with the user model';

        COMMENT ON COLUMN ${schema}.rec_sys_user_model.visited
            IS 'The visit dates of the user model';

        COMMENT ON COLUMN ${schema}.rec_sys_user_model.language
            IS 'The languages of the viewed materials';

        COMMENT ON COLUMN ${schema}.rec_sys_user_model.type
            IS 'The types of the viewed materials';

        COMMENT ON COLUMN ${schema}.rec_sys_user_model.concepts
            IS 'The aggregated concepts of viewed materials. Viewed as user interests';

        COMMENT ON COLUMN ${schema}.rec_sys_user_model.cookie_id
            IS 'The id of the associated record in the cookies table';`,


    rec_sys_user_selections:
        `CREATE TABLE ${schema}.rec_sys_user_selections (
            id          serial  PRIMARY KEY,
            query       jsonb   NOT NULL,
            results     jsonb   NOT NULL,
            selection   integer NOT NULL,
            uuid        varchar,

            cookie_id   integer,
            FOREIGN KEY (cookie_id) REFERENCES ${schema}.cookies(id) ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.rec_sys_user_selections
            OWNER TO ${config.pg.user};

        CREATE INDEX rec_sys_user_selections_id
            ON ${schema}.rec_sys_user_selections(id);

        CREATE INDEX rec_sys_user_selections_query
            ON ${schema}.rec_sys_user_selections USING GIN(query);



        CREATE TRIGGER update_rec_sys_user_selections_keys
            BEFORE INSERT OR UPDATE ON ${schema}.rec_sys_user_selections
            FOR EACH ROW
            EXECUTE PROCEDURE set_cookie_id();



        COMMENT ON TABLE ${schema}.rec_sys_user_selections
            IS 'The table containing the user selections from the recommender engine';

        COMMENT ON COLUMN ${schema}.rec_sys_user_selections.id
            IS 'The id of the user selection';

        COMMENT ON COLUMN ${schema}.rec_sys_user_selections.query
            IS 'The query provided by the user';

        COMMENT ON COLUMN ${schema}.rec_sys_user_selections.results
            IS 'The query results';

        COMMENT ON COLUMN ${schema}.rec_sys_user_selections.selection
            IS 'The user selection within the query';

        COMMENT ON COLUMN ${schema}.rec_sys_user_selections.uuid
            IS 'The user identifier extracted from the token that did the selection';

        COMMENT ON COLUMN ${schema}.rec_sys_user_selections.cookie_id
            IS 'The id of the user cookie that did the selection';`,


    rec_sys_user_transitions:
        `CREATE TABLE ${schema}.rec_sys_user_transitions (
            id                  serial PRIMARY KEY,
            uuid                varchar,
            from_url            varchar NOT NULL,
            to_url              varchar NOT NULL,

            cookie_id               integer,
            from_material_model_id  integer,
            to_material_model_id    integer,
            FOREIGN KEY (cookie_id)              REFERENCES ${schema}.cookies(id)                ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (from_material_model_id) REFERENCES ${schema}.rec_sys_material_model(id) ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (to_material_model_id)   REFERENCES ${schema}.rec_sys_material_model(id) ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.rec_sys_user_transitions
            OWNER TO ${config.pg.user};

        CREATE INDEX rec_sys_user_transitions_id
            ON ${schema}.rec_sys_user_transitions(id);

        CREATE INDEX rec_sys_user_transitions_from_material_model_id
            ON ${schema}.rec_sys_user_transitions(from_material_model_id);

        CREATE INDEX rec_sys_user_transitions_to_material_model_id
            ON ${schema}.rec_sys_user_transitions(to_material_model_id);

        CREATE INDEX rec_sys_user_transitions_uuid
            ON ${schema}.rec_sys_user_transitions(uuid);



        CREATE TRIGGER update_rec_sys_user_transitions_keys
            BEFORE INSERT OR UPDATE ON ${schema}.rec_sys_user_transitions
            FOR EACH ROW
            EXECUTE PROCEDURE set_cookie_id();



        COMMENT ON TABLE ${schema}.rec_sys_user_transitions
            IS 'The table containing the user transitions triggered by selection on the recommender engine';

        COMMENT ON COLUMN ${schema}.rec_sys_user_transitions.id
            IS 'The id of the user transition';

        COMMENT ON COLUMN ${schema}.rec_sys_user_transitions.from_material_model_id
            IS 'The url from which the user transitioned';

        COMMENT ON COLUMN ${schema}.rec_sys_user_transitions.to_material_model_id
            IS 'The url to which the user transitioned';

        COMMENT ON COLUMN ${schema}.rec_sys_user_transitions.uuid
            IS 'The transitioned user identifier extracted from the token';

        COMMENT ON COLUMN ${schema}.rec_sys_user_transitions.cookie_id
            IS 'The id of the user cookie that triggered the transition';`,


    tools:
        `CREATE TABLE ${schema}.tools (
            id          serial PRIMARY KEY,
            name        varchar (30) NOT NULL,
            description varchar,
            how_to      varchar
        );

        ALTER TABLE ${schema}.tools
            OWNER TO ${config.pg.user};

        CREATE INDEX tools_id
            ON ${schema}.tools(id);

        CREATE INDEX tools_name
            ON ${schema}.tools(name);

        CREATE INDEX tools_description
            ON ${schema}.tools(description);

        CREATE INDEX tools_how_to
            ON ${schema}.tools(how_to);



        COMMENT ON TABLE ${schema}.tools
            IS 'The table containing tool descriptions';

        COMMENT ON COLUMN ${schema}.tools.id
            IS 'The id of the tool';

        COMMENT ON COLUMN ${schema}.tools.name
            IS 'The name of the tool';

        COMMENT ON COLUMN ${schema}.tools.description
            IS 'The description of the tool';

        COMMENT ON COLUMN ${schema}.tools.how_to
            IS 'The how-to-use instructions of the tool';`,


    experiments:
        `CREATE TABLE ${schema}.experiments (
            id          serial PRIMARY KEY,
            script      varchar NOT NULL,
            params      jsonb NOT NULL,
            description varchar,
            date        timestamp with time zone NOT NULL DEFAULT NOW(),
            results     jsonb,

            tool_id     integer NOT NULL,

            FOREIGN KEY (tool_id) REFERENCES ${schema}.tools(id) ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.experiments
            OWNER TO ${config.pg.user};

        CREATE INDEX experiments_id
            ON ${schema}.experiments(id);

        CREATE INDEX experiments_script
            ON ${schema}.experiments(script);

        CREATE INDEX experiments_params
            ON ${schema}.experiments USING GIN(params);

        CREATE INDEX experiments_tool_id
            ON ${schema}.experiments(tool_id);



        COMMENT ON TABLE ${schema}.experiments
            IS 'The table containing the experiment information';

        COMMENT ON COLUMN ${schema}.experiments.id
            IS 'The id of the experiment';

        COMMENT ON COLUMN ${schema}.experiments.script
            IS 'The script used in the experiment';

        COMMENT ON COLUMN ${schema}.experiments.params
            IS 'The hyperparameters used in the experiment';

        COMMENT ON COLUMN ${schema}.experiments.description
            IS 'The optional description of the experiment';

        COMMENT ON COLUMN ${schema}.experiments.date
            IS 'The date the experiment was performed';

        COMMENT ON COLUMN ${schema}.experiments.results
            IS 'The results of the experiment';

        COMMENT ON COLUMN ${schema}.experiments.tool_id
            IS 'The id of the associated record in the tools table; used for the experiment';`,


    experiment_results:
        `CREATE TABLE ${schema}.experiment_results (
            id          serial PRIMARY KEY,
            results     jsonb NOT NULL,

            experiment_id integer NOT NULL,

            FOREIGN KEY (experiment_id) REFERENCES ${schema}.experiments(id) ON UPDATE CASCADE ON DELETE CASCADE
        );

        ALTER TABLE ${schema}.experiment_results
            OWNER TO ${config.pg.user};

        CREATE INDEX experiment_results_id
            ON ${schema}.experiment_results(id);

        CREATE INDEX experiment_results_experiment_id
            ON ${schema}.experiment_results(experiment_id);



        COMMENT ON TABLE ${schema}.experiment_results
            IS 'The table containing the experiment results';

        COMMENT ON COLUMN ${schema}.experiment_results.id
            IS 'The id of the experiment results';

        COMMENT ON COLUMN ${schema}.experiment_results.results
            IS 'The results of the experiment';

        COMMENT ON COLUMN ${schema}.experiment_results.experiment_id
            IS 'The id of the associated record in the experiments table';`,


    database_version:
        `CREATE TABLE ${schema}.database_version (
            version     integer PRIMARY KEY,
            date        timestamp with time zone DEFAULT NOW()
        );

        ALTER TABLE ${schema}.database_version
            OWNER TO ${config.pg.user};

        CREATE INDEX database_version_id
            ON ${schema}.database_version(version);



        CREATE FUNCTION update_date_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.date = now();
            RETURN NEW;
        END;
        $$ LANGUAGE 'plpgsql';

        CREATE TRIGGER update_database_version_date
            BEFORE UPDATE ON ${schema}.database_version
            FOR EACH ROW
            EXECUTE PROCEDURE update_date_column();



        COMMENT ON TABLE ${schema}.database_version
            IS 'The database version table';

        COMMENT ON COLUMN ${schema}.database_version.version
            IS 'The version number of the database';

        COMMENT ON COLUMN ${schema}.database_version.date
            IS 'The time when the database was update to the provided version';`

};


/**
 * @description The object describing the database changes done since
 * the previous version.
 * @typedef {Object} db_update
 * @property {Number} version - Indicates the version of the updated database.
 * @property {String} update - An SQL query describing the changes in the
 * database for that version.
 */

/**
 * @description The array containing database updates.
 * @type {db_update[]}
 */
const dbUpdates = [];

// get the requested database version
const pgVersion = config.pg.version === '*' ?
                  dbUpdates.length :
                  config.pg.version;


/////////////////////////////////////////////////
// Helper functions
/////////////////////////////////////////////////


/**
 * @description Initializes the schema creation process.
 * @returns {Promise} A promise that will create the requested schema.
 */
function prepareSchema() {
    // returns row containing boolean true if schema in config exists, false otherwise
    return new Promise((resolve, reject) => {
        pg.execute(schemaExistsString, [], function (error, result) {
            if (error) {
                // on error reject the process
                return reject(error);
            } else if (result[0].schema_exists) {
                // the schema already exists, continue process
                return resolve();
            }

            console.log(`Creating new schema=${schema.toUpperCase()}`);

            // creates new schema from the configurations
            pg.execute(createSchemaString, [], function (xerror, xresult) {
                if (xerror) {
                    console.log(`Error creating schema= ${xerror.message}`);
                    return reject(xerror);
                }
                return resolve();
            }); // pg.execute(createSchemaString)
        }); // pg.execute(schemaExistsString)
    }); // Promise(resolve, reject)
} // prepareSchema()


/**
 * @describe Checks and creates non-existing database tables.
 * @returns {Promise} A promise that will check and create non-existing
 * database tables.
 */
function prepareTables() {

    return new Promise((resolve, reject) => {
        // check if the tables exist in the database
        pg.execute(tablesExistString, [], function (error, result) {
            if (error) { return reject(error); }

            // delete already existing tables from dbCreates object
            for (let i = 0; i < result.length; i++) {
                const tableName = result[i].table_name;
                delete dbCreates[tableName];
            }

            // create a list of all non-existing tables to loop through with async
            let tableNames = Object.keys(dbCreates);

            async.eachSeries(tableNames,
                // 2nd param is the function that each item is passed to
                function (tableName, callback) {
                    const sqlStatement = dbCreates[tableName];
                    // execute create query from dbCreates for a specific table
                    pg.execute(sqlStatement, [], function (xerror, result) {
                        if (xerror) { return callback(xerror); }
                        return callback();
                    });

                },
                function (xerror) {
                    // All tasks are done now
                    if (xerror) { return reject(xerror); }
                    return resolve();
                }
            ); // async.eachSeries(tableCreates)
        }); // pg.execute(tablesExistString)
    }); // Promise(resolve, reject)

} // prepareTables()


/**
 * Updates DB to version specified in config.json
 * To implement an update, add following block:
 * doUpdate(X, '<SQL STRING>');
 * X -> Update level ( 1 more than previous)
 * <SQL STRING> -> SQL statement for update.
 * For multiple statements, it's possible to separate them with semi-colon-';'
 *
 * @returns Version DB was updated to
 */

/**
 * @description Updates the database tables.
 * @returns {Promise} The promise of updating the database tables.
 */
function updateTables () {

    return new Promise((resolve, reject) => {
        // setup the goal and the maximum database version
        const vGoal = parseInt(pgVersion);
        const vMax = (dbUpdates.length)? dbUpdates[dbUpdates.length - 1].version : 0;
        let vCurrent = 0;

        console.log(`About to update DB to version ${vGoal} out of max version: ${vMax}`);

        /////////////////////////////////////////////////
        // Internal helper functions
        /////////////////////////////////////////////////

        /**
         * @description Updates the database version.
         * @param {Number | String} _version - The current database version.
         * @param {Function} callback - The function called after the process ends.
         */
        function updateDatabaseVersion (_version, callback) {
            const version = parseInt(_version);

            console.log(`Updating database version : v${version} => v${version + 1}`);

            // create an SQL statement for updating database version
            let query = `UPDATE ${schema}.database_version
                            SET version = ${version + 1}
                            WHERE version = ${version};`;

            if (version === 0) {
                query = `INSERT INTO ${schema}.database_version (version) VALUES (1);`;
            }

            // execute the version update statement
            pg.execute(query, [], function (error, r) {
                return callback(error);
            });
        }


        /**
         * @describe Updates the database with the provided SQL statement.
         * @param {Number} _version - The current version in consideration.
         * @param {String} _sql - The SQL statement to be executed.
         * @param {Function} callback - The function executed at the end of the process.
         */
        function updateDatabaseTables(_version, _sql, callback) {

            if (vCurrent < _version && _version <= vGoal) {

                if (_sql == '') {
                    // update the database version
                    return updateDatabaseVersion(vCurrent, function (error) {
                        if (error) { return callback(error); }

                        vCurrent++;
                        return callback(null);
                    }); // updateDatabaseVersion(vCurrent)
                }

                pg.execute(_sql, [], function (error, result) {
                    if (error) { return callback(error); }

                    // update the database version
                    return updateDatabaseVersion(vCurrent, function (xerror) {
                        if (xerror) { return callback(xerror); }

                        vCurrent++;
                        return callback(null);
                    }); // updateDatabaseVersion(vCurrent)
                }); // pg.execute(_sql)

            } else { return callback(null); }

        } // updateDatabase(_version, _sql, callback)


        /////////////////////////////////////////////////
        // Function execution
        /////////////////////////////////////////////////

        // returns a row containing integer version of DB
        pg.execute(checkVersion, [], function (error, result) {
            if (error) { return reject(error); }

            // were there any versions already stored
            if (result.length > 0) {
                // get the latest version
                vCurrent = result.map(rec => rec.version)
                                .reduce((prev, curr) => Math.max(prev, curr), 0);
            }
            console.log(`Current version is ${vCurrent}`);

            // loop through all database updates and execute the change
            async.eachSeries(dbUpdates,
                // 2nd param is the function that each item is passed to
                function (dbUpdate, callback) {
                    updateDatabaseTables(dbUpdate.version, dbUpdate.update, callback);
                },
                // 3rd param is the function to call when everything's done
                function (xerror) {
                    // All tasks are done now
                    if (xerror) { return reject(xerror); }
                    return resolve();
                }
            );//async.eachSeries(dbUpdates)
        }); // pg.execute(checkVersion)

    }); // Promise(resolve, reject)

} // updateTables()


/**
 * @description Executes the whole database creation and update process.
 * @param {Function} [callback] - The function executed at the end of the process.
 */
function startDBCreate(callback) {
    console.log('Checking whether to update database');
    return prepareSchema()
        .then(prepareTables)
        .then(updateTables)
        .then(() => {
            // execute callback if present
            if (callback && typeof(callback) === 'function') {
                callback();
            }
        })
        .catch(error => {
            console.log('Error when creating database', error);
        })
        .then(() => { pg.close(); });
} // startDBCreate(callback)


/////////////////////////////////////////////////
// Script export
/////////////////////////////////////////////////

exports.startDBCreate = startDBCreate;