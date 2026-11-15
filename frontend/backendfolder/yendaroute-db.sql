--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg110+1)
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg110+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: tiger; Type: SCHEMA; Schema: -; Owner: yenda
--

CREATE SCHEMA tiger;


ALTER SCHEMA tiger OWNER TO yenda;

--
-- Name: tiger_data; Type: SCHEMA; Schema: -; Owner: yenda
--

CREATE SCHEMA tiger_data;


ALTER SCHEMA tiger_data OWNER TO yenda;

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: yenda
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO yenda;

--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: yenda
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;


--
-- Name: EXTENSION fuzzystrmatch; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgis_tiger_geocoder; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder WITH SCHEMA tiger;


--
-- Name: EXTENSION postgis_tiger_geocoder; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_tiger_geocoder IS 'PostGIS tiger geocoder and reverse geocoder';


--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: bookings_status_enum; Type: TYPE; Schema: public; Owner: yenda
--

CREATE TYPE public.bookings_status_enum AS ENUM (
    'draft',
    'reviewed',
    'paid',
    'confirmed',
    'cancelled',
    'expired'
);


ALTER TYPE public.bookings_status_enum OWNER TO yenda;

--
-- Name: payments_method_enum; Type: TYPE; Schema: public; Owner: yenda
--

CREATE TYPE public.payments_method_enum AS ENUM (
    'mobile_money',
    'bank_card'
);


ALTER TYPE public.payments_method_enum OWNER TO yenda;

--
-- Name: payments_status_enum; Type: TYPE; Schema: public; Owner: yenda
--

CREATE TYPE public.payments_status_enum AS ENUM (
    'pending',
    'successful',
    'failed'
);


ALTER TYPE public.payments_status_enum OWNER TO yenda;

--
-- Name: role_requests_status_enum; Type: TYPE; Schema: public; Owner: yenda
--

CREATE TYPE public.role_requests_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.role_requests_status_enum OWNER TO yenda;

--
-- Name: role_requests_type_enum; Type: TYPE; Schema: public; Owner: yenda
--

CREATE TYPE public.role_requests_type_enum AS ENUM (
    'admin',
    'driver'
);


ALTER TYPE public.role_requests_type_enum OWNER TO yenda;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: yenda
--

CREATE TYPE public.users_role_enum AS ENUM (
    'admin',
    'passenger',
    'driver'
);


ALTER TYPE public.users_role_enum OWNER TO yenda;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: booking_seats; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.booking_seats (
    id integer NOT NULL,
    "bookingId" integer NOT NULL,
    "scheduleId" integer NOT NULL,
    "travelDate" date NOT NULL,
    "seatNumber" character varying NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.booking_seats OWNER TO yenda;

--
-- Name: booking_seats_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.booking_seats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.booking_seats_id_seq OWNER TO yenda;

--
-- Name: booking_seats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.booking_seats_id_seq OWNED BY public.booking_seats.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    reference character varying NOT NULL,
    "userId" integer NOT NULL,
    "scheduleId" integer NOT NULL,
    "travelDate" date NOT NULL,
    "seatNumber" character varying,
    "originStopId" integer NOT NULL,
    "destinationStopId" integer NOT NULL,
    fare numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'MWK'::character varying NOT NULL,
    status public.bookings_status_enum DEFAULT 'confirmed'::public.bookings_status_enum NOT NULL,
    "holdExpiresAt" timestamp with time zone,
    "passengerName" character varying,
    "passengerEmail" character varying,
    "phoneNumber" character varying,
    "identificationNumber" character varying,
    "idempotencyKey" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bookings OWNER TO yenda;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO yenda;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: fares; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.fares (
    id integer NOT NULL,
    "routeId" integer NOT NULL,
    "originStopId" integer NOT NULL,
    "destinationStopId" integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'MWK'::character varying NOT NULL
);


ALTER TABLE public.fares OWNER TO yenda;

--
-- Name: fares_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.fares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fares_id_seq OWNER TO yenda;

--
-- Name: fares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.fares_id_seq OWNED BY public.fares.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" integer NOT NULL,
    title character varying NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO yenda;

--
-- Name: passenger_profiles; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.passenger_profiles (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    "identificationNumber" character varying,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.passenger_profiles OWNER TO yenda;

--
-- Name: passenger_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.passenger_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.passenger_profiles_id_seq OWNER TO yenda;

--
-- Name: passenger_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.passenger_profiles_id_seq OWNED BY public.passenger_profiles.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "bookingId" integer NOT NULL,
    "bookingReference" character varying NOT NULL,
    "userId" integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'MWK'::character varying NOT NULL,
    method public.payments_method_enum NOT NULL,
    provider character varying DEFAULT 'simulated'::character varying NOT NULL,
    status public.payments_status_enum DEFAULT 'pending'::public.payments_status_enum NOT NULL,
    "transactionReference" character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO yenda;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "tokenHash" character varying NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "revokedAt" timestamp with time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO yenda;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO yenda;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: role_requests; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.role_requests (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    type public.role_requests_type_enum NOT NULL,
    status public.role_requests_status_enum DEFAULT 'pending'::public.role_requests_status_enum NOT NULL,
    reason character varying,
    "licenseId" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_requests OWNER TO yenda;

--
-- Name: role_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.role_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_requests_id_seq OWNER TO yenda;

--
-- Name: role_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.role_requests_id_seq OWNED BY public.role_requests.id;


--
-- Name: route_stops; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.route_stops (
    id integer NOT NULL,
    "routeId" integer NOT NULL,
    "stopId" integer NOT NULL,
    sequence integer NOT NULL
);


ALTER TABLE public.route_stops OWNER TO yenda;

--
-- Name: route_stops_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.route_stops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.route_stops_id_seq OWNER TO yenda;

--
-- Name: route_stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.route_stops_id_seq OWNED BY public.route_stops.id;


--
-- Name: routes; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.routes (
    id integer NOT NULL,
    name character varying NOT NULL,
    "originStopId" integer NOT NULL,
    "destinationStopId" integer NOT NULL,
    "companyName" character varying,
    "pickupLocation" character varying,
    featured boolean DEFAULT false NOT NULL,
    geometry jsonb,
    distance double precision,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.routes OWNER TO yenda;

--
-- Name: routes_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.routes_id_seq OWNER TO yenda;

--
-- Name: routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.routes_id_seq OWNED BY public.routes.id;


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.schedules (
    id integer NOT NULL,
    "routeId" integer NOT NULL,
    "vehicleId" integer NOT NULL,
    "departureStopId" integer NOT NULL,
    "departureTime" time without time zone NOT NULL,
    "arrivalAt" time without time zone,
    fare numeric(10,2),
    "daysOfWeek" character varying[] NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.schedules OWNER TO yenda;

--
-- Name: schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schedules_id_seq OWNER TO yenda;

--
-- Name: schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.schedules_id_seq OWNED BY public.schedules.id;


--
-- Name: stops; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.stops (
    id integer NOT NULL,
    name character varying NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    description character varying,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.stops OWNER TO yenda;

--
-- Name: stops_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.stops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stops_id_seq OWNER TO yenda;

--
-- Name: stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.stops_id_seq OWNED BY public.stops.id;


--
-- Name: token_blacklist; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.token_blacklist (
    id integer NOT NULL,
    token character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.token_blacklist OWNER TO yenda;

--
-- Name: token_blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.token_blacklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.token_blacklist_id_seq OWNER TO yenda;

--
-- Name: token_blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.token_blacklist_id_seq OWNED BY public.token_blacklist.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.users (
    id integer NOT NULL,
    "fullName" character varying NOT NULL,
    email character varying NOT NULL,
    "phoneNumber" character varying,
    "passwordHash" character varying NOT NULL,
    role public.users_role_enum DEFAULT 'passenger'::public.users_role_enum NOT NULL,
    "licenseId" character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO yenda;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO yenda;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: yenda
--

CREATE TABLE public.vehicles (
    id integer NOT NULL,
    "plateNumber" character varying NOT NULL,
    "vehicleType" character varying NOT NULL,
    capacity integer NOT NULL,
    description character varying,
    "driverId" integer,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.vehicles OWNER TO yenda;

--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: yenda
--

CREATE SEQUENCE public.vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicles_id_seq OWNER TO yenda;

--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yenda
--

ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;


--
-- Name: booking_seats id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.booking_seats ALTER COLUMN id SET DEFAULT nextval('public.booking_seats_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: fares id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.fares ALTER COLUMN id SET DEFAULT nextval('public.fares_id_seq'::regclass);


--
-- Name: passenger_profiles id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.passenger_profiles ALTER COLUMN id SET DEFAULT nextval('public.passenger_profiles_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: role_requests id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.role_requests ALTER COLUMN id SET DEFAULT nextval('public.role_requests_id_seq'::regclass);


--
-- Name: route_stops id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.route_stops ALTER COLUMN id SET DEFAULT nextval('public.route_stops_id_seq'::regclass);


--
-- Name: routes id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.routes ALTER COLUMN id SET DEFAULT nextval('public.routes_id_seq'::regclass);


--
-- Name: schedules id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.schedules ALTER COLUMN id SET DEFAULT nextval('public.schedules_id_seq'::regclass);


--
-- Name: stops id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.stops ALTER COLUMN id SET DEFAULT nextval('public.stops_id_seq'::regclass);


--
-- Name: token_blacklist id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.token_blacklist ALTER COLUMN id SET DEFAULT nextval('public.token_blacklist_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vehicles id; Type: DEFAULT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);


--
-- Data for Name: booking_seats; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.booking_seats (id, "bookingId", "scheduleId", "travelDate", "seatNumber", active) FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.bookings (id, reference, "userId", "scheduleId", "travelDate", "seatNumber", "originStopId", "destinationStopId", fare, currency, status, "holdExpiresAt", "passengerName", "passengerEmail", "phoneNumber", "identificationNumber", "idempotencyKey", "createdAt") FROM stdin;
\.


--
-- Data for Name: fares; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.fares (id, "routeId", "originStopId", "destinationStopId", amount, currency) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.notifications (id, "userId", title, message, "isRead", "createdAt") FROM stdin;
\.


--
-- Data for Name: passenger_profiles; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.passenger_profiles (id, "userId", name, email, phone, "identificationNumber", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.payments (id, "bookingId", "bookingReference", "userId", amount, currency, method, provider, status, "transactionReference", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.refresh_tokens (id, "userId", "tokenHash", "expiresAt", "revokedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: role_requests; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.role_requests (id, "userId", type, status, reason, "licenseId", "createdAt") FROM stdin;
\.


--
-- Data for Name: route_stops; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.route_stops (id, "routeId", "stopId", sequence) FROM stdin;
\.


--
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.routes (id, name, "originStopId", "destinationStopId", "companyName", "pickupLocation", featured, geometry, distance, "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.schedules (id, "routeId", "vehicleId", "departureStopId", "departureTime", "arrivalAt", fare, "daysOfWeek", "isActive") FROM stdin;
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: stops; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.stops (id, name, latitude, longitude, description, "isActive") FROM stdin;
\.


--
-- Data for Name: token_blacklist; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.token_blacklist (id, token, "createdAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.users (id, "fullName", email, "phoneNumber", "passwordHash", role, "licenseId", "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: yenda
--

COPY public.vehicles (id, "plateNumber", "vehicleType", capacity, description, "driverId", "isActive") FROM stdin;
\.


--
-- Data for Name: geocode_settings; Type: TABLE DATA; Schema: tiger; Owner: yenda
--

COPY tiger.geocode_settings (name, setting, unit, category, short_desc) FROM stdin;
\.


--
-- Data for Name: pagc_gaz; Type: TABLE DATA; Schema: tiger; Owner: yenda
--

COPY tiger.pagc_gaz (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_lex; Type: TABLE DATA; Schema: tiger; Owner: yenda
--

COPY tiger.pagc_lex (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_rules; Type: TABLE DATA; Schema: tiger; Owner: yenda
--

COPY tiger.pagc_rules (id, rule, is_custom) FROM stdin;
\.


--
-- Data for Name: topology; Type: TABLE DATA; Schema: topology; Owner: yenda
--

COPY topology.topology (id, name, srid, "precision", hasz) FROM stdin;
\.


--
-- Data for Name: layer; Type: TABLE DATA; Schema: topology; Owner: yenda
--

COPY topology.layer (topology_id, layer_id, schema_name, table_name, feature_column, feature_type, level, child_id) FROM stdin;
\.


--
-- Name: booking_seats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.booking_seats_id_seq', 1, false);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.bookings_id_seq', 1, false);


--
-- Name: fares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.fares_id_seq', 1, false);


--
-- Name: passenger_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.passenger_profiles_id_seq', 1, false);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 1, false);


--
-- Name: role_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.role_requests_id_seq', 1, false);


--
-- Name: route_stops_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.route_stops_id_seq', 1, false);


--
-- Name: routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.routes_id_seq', 1, false);


--
-- Name: schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.schedules_id_seq', 1, false);


--
-- Name: stops_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.stops_id_seq', 1, false);


--
-- Name: token_blacklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.token_blacklist_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: vehicles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yenda
--

SELECT pg_catalog.setval('public.vehicles_id_seq', 1, false);


--
-- Name: topology_id_seq; Type: SEQUENCE SET; Schema: topology; Owner: yenda
--

SELECT pg_catalog.setval('topology.topology_id_seq', 1, false);


--
-- Name: fares PK_01e9e567db5766e439be822b3d1; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.fares
    ADD CONSTRAINT "PK_01e9e567db5766e439be822b3d1" PRIMARY KEY (id);


--
-- Name: vehicles PK_18d8646b59304dce4af3a9e35b6; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY (id);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: route_stops PK_22c09afc24c0a7a13644c629073; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT "PK_22c09afc24c0a7a13644c629073" PRIMARY KEY (id);


--
-- Name: role_requests PK_32873821a9e1122603cc2fb86a9; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.role_requests
    ADD CONSTRAINT "PK_32873821a9e1122603cc2fb86a9" PRIMARY KEY (id);


--
-- Name: token_blacklist PK_3e37528d03f0bd5335874afa48d; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT "PK_3e37528d03f0bd5335874afa48d" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: passenger_profiles PK_70936a0d464b476507cf4f2889e; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.passenger_profiles
    ADD CONSTRAINT "PK_70936a0d464b476507cf4f2889e" PRIMARY KEY (id);


--
-- Name: routes PK_76100511cdfa1d013c859f01d8b; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY (id);


--
-- Name: refresh_tokens PK_7d8bee0204106019488c4c50ffa; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);


--
-- Name: schedules PK_7e33fc2ea755a5765e3564e66dd; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "PK_7e33fc2ea755a5765e3564e66dd" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: booking_seats PK_a4d929dea33a0153ba9bc253db1; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.booking_seats
    ADD CONSTRAINT "PK_a4d929dea33a0153ba9bc253db1" PRIMARY KEY (id);


--
-- Name: bookings PK_bee6805982cc1e248e94ce94957; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY (id);


--
-- Name: stops PK_ed1be877403ad3c921b07f62ca5; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT "PK_ed1be877403ad3c921b07f62ca5" PRIMARY KEY (id);


--
-- Name: payments UQ_3ce03173f1f1ca0ef77a09175ff; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "UQ_3ce03173f1f1ca0ef77a09175ff" UNIQUE ("transactionReference");


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: refresh_tokens UQ_c25bc63d248ca90e8dcc1d92d06; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "UQ_c25bc63d248ca90e8dcc1d92d06" UNIQUE ("tokenHash");


--
-- Name: passenger_profiles UQ_d5434dccdc9c9393c5deb856244; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.passenger_profiles
    ADD CONSTRAINT "UQ_d5434dccdc9c9393c5deb856244" UNIQUE ("userId");


--
-- Name: bookings UQ_d7eca65f0a4d442ec4491f2f804; Type: CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "UQ_d7eca65f0a4d442ec4491f2f804" UNIQUE (reference);


--
-- Name: IDX_23d5ead5a812bb8c246ab6e3e0; Type: INDEX; Schema: public; Owner: yenda
--

CREATE UNIQUE INDEX "IDX_23d5ead5a812bb8c246ab6e3e0" ON public.bookings USING btree ("userId", "idempotencyKey") WHERE ("idempotencyKey" IS NOT NULL);


--
-- Name: IDX_610102b60fea1455310ccd299d; Type: INDEX; Schema: public; Owner: yenda
--

CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON public.refresh_tokens USING btree ("userId");


--
-- Name: IDX_692a909ee0fa9383e7859f9b40; Type: INDEX; Schema: public; Owner: yenda
--

CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON public.notifications USING btree ("userId");


--
-- Name: IDX_715322f0232292c929caa70da7; Type: INDEX; Schema: public; Owner: yenda
--

CREATE INDEX "IDX_715322f0232292c929caa70da7" ON public.payments USING btree ("bookingReference");


--
-- Name: IDX_a993c1b8c80b17513cfe0f77d5; Type: INDEX; Schema: public; Owner: yenda
--

CREATE UNIQUE INDEX "IDX_a993c1b8c80b17513cfe0f77d5" ON public.booking_seats USING btree ("scheduleId", "travelDate", "seatNumber") WHERE (active = true);


--
-- Name: schedules FK_1784c238da5fb3488f82b6a5176; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "FK_1784c238da5fb3488f82b6a5176" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: payments FK_1ead3dc5d71db0ea822706e389d; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_1ead3dc5d71db0ea822706e389d" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: schedules FK_208f5774e058ba0856acdf34966; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "FK_208f5774e058ba0856acdf34966" FOREIGN KEY ("departureStopId") REFERENCES public.stops(id);


--
-- Name: vehicles FK_28d7607488252336b22511e9e80; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "FK_28d7607488252336b22511e9e80" FOREIGN KEY ("driverId") REFERENCES public.users(id);


--
-- Name: route_stops FK_352e45964a86c097a435f643004; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT "FK_352e45964a86c097a435f643004" FOREIGN KEY ("routeId") REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- Name: bookings FK_38a69a58a323647f2e75eb994de; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_38a69a58a323647f2e75eb994de" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: bookings FK_50d60a490fe344e31ab9d5e9558; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_50d60a490fe344e31ab9d5e9558" FOREIGN KEY ("originStopId") REFERENCES public.stops(id);


--
-- Name: notifications FK_692a909ee0fa9383e7859f9b406; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: routes FK_6afb5fa168964d91c7a56f1d7f4; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT "FK_6afb5fa168964d91c7a56f1d7f4" FOREIGN KEY ("originStopId") REFERENCES public.stops(id);


--
-- Name: schedules FK_796dabf6a5077692672d42e704b; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "FK_796dabf6a5077692672d42e704b" FOREIGN KEY ("routeId") REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- Name: booking_seats FK_7efd3a3e653dcc3cfa9ce09a88e; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.booking_seats
    ADD CONSTRAINT "FK_7efd3a3e653dcc3cfa9ce09a88e" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: routes FK_90a7553ace1e500658cdf4ee582; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT "FK_90a7553ace1e500658cdf4ee582" FOREIGN KEY ("destinationStopId") REFERENCES public.stops(id);


--
-- Name: fares FK_924979b6bf5f8613512232fb7fe; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.fares
    ADD CONSTRAINT "FK_924979b6bf5f8613512232fb7fe" FOREIGN KEY ("destinationStopId") REFERENCES public.stops(id);


--
-- Name: fares FK_9324bfef46d458d6c18780448ba; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.fares
    ADD CONSTRAINT "FK_9324bfef46d458d6c18780448ba" FOREIGN KEY ("originStopId") REFERENCES public.stops(id);


--
-- Name: bookings FK_a991b6a47c033f71108bf236c88; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_a991b6a47c033f71108bf236c88" FOREIGN KEY ("scheduleId") REFERENCES public.schedules(id) ON DELETE CASCADE;


--
-- Name: fares FK_b212c710483549a61acb7de804d; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.fares
    ADD CONSTRAINT "FK_b212c710483549a61acb7de804d" FOREIGN KEY ("routeId") REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- Name: bookings FK_de03146c95e8758f3fcc7d5bce7; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_de03146c95e8758f3fcc7d5bce7" FOREIGN KEY ("destinationStopId") REFERENCES public.stops(id);


--
-- Name: route_stops FK_fefca87f7a05a20b8ae86752d1a; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT "FK_fefca87f7a05a20b8ae86752d1a" FOREIGN KEY ("stopId") REFERENCES public.stops(id);


--
-- Name: role_requests FK_ff3f8186b791342ee814223999e; Type: FK CONSTRAINT; Schema: public; Owner: yenda
--

ALTER TABLE ONLY public.role_requests
    ADD CONSTRAINT "FK_ff3f8186b791342ee814223999e" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

