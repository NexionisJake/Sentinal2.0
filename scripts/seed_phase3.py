import os

sql_statements = [
    "CREATE DATABASE IF NOT EXISTS inclusiweb_geo;",
    
    # 1. safe_sites table
    """
    CREATE TABLE IF NOT EXISTS inclusiweb_geo.safe_sites
    (
        site_id String,
        site_name String,
        lat Float64,
        lon Float64,
        max_land_capacity UInt32,
        max_water_capacity UInt32,
        max_road_capacity UInt32
    )
    ENGINE = MergeTree()
    ORDER BY site_id;
    """,
    "TRUNCATE TABLE inclusiweb_geo.safe_sites;",
    """
    INSERT INTO inclusiweb_geo.safe_sites VALUES
    ('SITE_01', 'Kalpetta Relief Hub Alpha', 11.6120, 76.0950, 2500, 2200, 1400),
    ('SITE_02', 'Mananthavady Highland Sanctuary', 11.8010, 76.0020, 3000, 1600, 3500),
    ('SITE_03', 'Sultan Bathery Safe Enclave', 11.6620, 76.2550, 1800, 2400, 2200),
    ('SITE_04', 'Vythiri Ridge Shelter Beta', 11.5550, 76.0380, 1200, 1100, 900);
    """,

    # 2. Re-create habitations with vulnerability parameters
    "DROP TABLE IF EXISTS inclusiweb_geo.habitations;",
    """
    CREATE TABLE inclusiweb_geo.habitations
    (
        habitation_id String,
        village_name String,
        lat Float64,
        lon Float64,
        population UInt32,
        vulnerability_score Float64,
        kutcha_ratio Float64,
        elderly_ratio Float64
    )
    ENGINE = MergeTree()
    ORDER BY habitation_id;
    """,
    """
    INSERT INTO inclusiweb_geo.habitations VALUES
    ('HAB_01', 'Mundakkai', 11.5300, 76.1400, 1450, 8.8, 0.75, 0.32),
    ('HAB_02', 'Chooralmala', 11.5400, 76.1600, 2100, 9.2, 0.82, 0.38),
    ('HAB_03', 'Vythiri', 11.5500, 76.0400, 3200, 6.5, 0.45, 0.22),
    ('HAB_04', 'Meppadi', 11.5500, 76.1200, 4100, 7.8, 0.58, 0.28),
    ('HAB_05', 'Kalpetta Central', 11.6080, 76.0800, 12500, 4.2, 0.25, 0.15),
    ('HAB_06', 'Attamala', 11.5150, 76.1550, 980, 8.9, 0.78, 0.35),
    ('HAB_07', 'Vellarmala', 11.5250, 76.1480, 1120, 9.1, 0.80, 0.36),
    ('HAB_08', 'Puthumala', 11.5600, 76.1100, 1650, 8.1, 0.65, 0.30);
    """,

    # 3. road_networks table
    """
    CREATE TABLE IF NOT EXISTS inclusiweb_geo.road_networks
    (
        route_id String,
        from_village_id String,
        to_site_id String,
        choke_point_lat Float64,
        choke_point_lon Float64,
        bottleneck_type String,
        road_width_m Float64
    )
    ENGINE = MergeTree()
    ORDER BY route_id;
    """,
    "TRUNCATE TABLE inclusiweb_geo.road_networks;",
    """
    INSERT INTO inclusiweb_geo.road_networks VALUES
    ('ROUTE_01', 'HAB_01', 'SITE_01', 11.5650, 76.1150, 'ROAD_WIDTH', 3.5),
    ('ROUTE_02', 'HAB_02', 'SITE_01', 11.5720, 76.1280, 'ROAD_WIDTH', 4.0),
    ('ROUTE_03', 'HAB_06', 'SITE_01', 11.5400, 76.1300, 'WATER_LIMIT', 5.0),
    ('ROUTE_04', 'HAB_07', 'SITE_01', 11.5450, 76.1350, 'ROAD_WIDTH', 3.2),
    ('ROUTE_05', 'HAB_08', 'SITE_01', 11.5850, 76.1000, 'LAND_LIMIT', 6.0),
    ('ROUTE_06', 'HAB_03', 'SITE_04', 11.5520, 76.0390, 'ROAD_WIDTH', 3.8),
    ('ROUTE_07', 'HAB_04', 'SITE_01', 11.5800, 76.1050, 'WATER_LIMIT', 5.5);
    """
]

os.makedirs("/tmp/inclusiweb", exist_ok=True)
with open("/tmp/inclusiweb/seed_phase3.sql", "w") as f:
    f.write("\n".join(sql_statements))

print("Phase 3 seed SQL generated.")
