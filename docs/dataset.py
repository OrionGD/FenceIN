from pathlib import Path
import pandas as pd
import random

rows = []

def make_row(roleLevel, user_id, first, last, tenantName, tenantId, userRole, reportsTo="", vendorId=""):
    email = f"{first.lower().replace(' ','')}.{last.lower().replace(' ','')}@fencein.app"
    rows.append({
        "roleLevel": roleLevel,
        "user_id": user_id,
        "firstName": first,
        "lastName": last,
        "email": email,
        "password": f"fencein@{user_id}",
        "tenantName": tenantName,
        "tenantId": tenantId,
        "userRole": userRole,
        "reportsTo": reportsTo,
        "state": "ACTIVE",
        "faceEmbedding": "NULL",
        "fingerprintTemplate": "NULL",
        "faceRegistered": False,
        "fingerprintRegistered": False,
        "phone": f"+9198{random.randint(10000000,99999999)}",
        "govId": f"GOV{random.randint(10000,99999)}",
        "bloodGroup": random.choice(["A+","B+","O+","AB+","A-","B-"]),
        "address": tenantName,
        "skillType": random.choice(["Security","Electrical","Welding","Operations","Administration","Surveillance"]),
        "shiftId": random.choice(["SHIFT001","SHIFT002","SHIFT003"]),
        "vendorId": vendorId,
        "isActive": True,
        "mustChangePassword": False
    })

# Organizations
orgs = [
    ("ORG001", "SHIELD"),
    ("ORG002", "ARGUS")
]

# Super Admins
make_row(1, "SA001", "Nick", "Fury", "SHIELD", "ORG001", "SUPER_ADMIN", "ORG001")
make_row(1, "SA002", "Amanda", "Waller", "ARGUS", "ORG002", "SUPER_ADMIN", "ORG002")

# Org Admins
org_admins = [
    ("OA001","Tony","Stark","SHIELD","ORG001","SA001"),
    ("OA002","Bruce","Banner","SHIELD","ORG001","SA001"),
    ("OA003","Bruce","Wayne","ARGUS","ORG002","SA002"),
    ("OA004","Lex","Luthor","ARGUS","ORG002","SA002"),
]

for oa in org_admins:
    make_row(2, oa[0], oa[1], oa[2], oa[3], oa[4], "ORG_ADMIN", oa[5])

# Supervisors
supervisors = [
    ("SP001","Steve","Rogers","SHIELD","ORG001","OA001"),
    ("SP002","TChalla","Wakanda","SHIELD","ORG001","OA002"),
    ("SP003","Batman","Gotham","ARGUS","ORG002","OA003"),
    ("SP004","Jonn","Jonzz","ARGUS","ORG002","OA004"),
]

for sp in supervisors:
    make_row(3, sp[0], sp[1], sp[2], sp[3], sp[4], "SUPERVISOR", sp[5])

# Security Officers
security = [
("SO001","Natasha","Romanoff","SHIELD","ORG001","SP001"),
("SO002","Clint","Barton","SHIELD","ORG001","SP001"),
("SO003","Sam","Wilson","SHIELD","ORG001","SP002"),
("SO004","Bucky","Barnes","SHIELD","ORG001","SP002"),
("SO005","Dick","Grayson","ARGUS","ORG002","SP003"),
("SO006","Jason","Todd","ARGUS","ORG002","SP003"),
("SO007","Oliver","Queen","ARGUS","ORG002","SP004"),
("SO008","Victor","Stone","ARGUS","ORG002","SP004"),
]

for so in security:
    make_row(4, so[0], so[1], so[2], so[3], so[4], "SECURITY_OFFICER", so[5])

# Vendors
vendors = [
("VN001","Thor","Industries","SHIELD","ORG001","SP001"),
("VN002","Wakanda","Tech","SHIELD","ORG001","SP001"),
("VN003","Asgard","Logistics","SHIELD","ORG001","SP001"),
("VN004","Stark","Security","SHIELD","ORG001","SP001"),
("VN005","XMen","Workforce","SHIELD","ORG001","SP001"),
("VN006","Wayne","Enterprises","ARGUS","ORG002","SP003"),
("VN007","DailyPlanet","Services","ARGUS","ORG002","SP003"),
("VN008","STARLabs","Ops","ARGUS","ORG002","SP003"),
("VN009","Queen","Consolidated","ARGUS","ORG002","SP003"),
("VN010","Atlantis","MarineWorks","ARGUS","ORG002","SP003"),
]

for vn in vendors:
    make_row(5, vn[0], vn[1], vn[2], vn[3], vn[4], "VENDOR_MANAGER", vn[5])

# 100 Workers
worker_names = [
"Loki","Heimdall","Valkyrie","Sif","Korg","Miek","Volstagg","Fandral","Hogun","BetaRay",
"Shuri","Okoye","Nakia","MBaku","Ramonda","Everett","Killmonger","Ayo","Attuma","Namor",
"Jane","Darcy","Selvig","Odin","Frigga","Hela","Grandmaster","Gorr","Thunderstrike","Skurge",
"WarMachine","Pepper","Happy","Vision","Jarvis","Ironheart","Rescue","Whiplash","Ultron","CrimsonDynamo",
"Wolverine","Cyclops","Storm","JeanGrey","Beast","Rogue","Gambit","Iceman","Colossus","Nightcrawler",
"Alfred","Lucius","Batgirl","RedHood","Batwoman","Huntress","Azrael","Oracle","Damian","Tim",
"Superman","Lois","Jimmy","Perry","Supergirl","Steel","Bizarro","Zod","Krypto","JonKent",
"Flash","Cisco","Caitlin","ReverseFlash","KidFlash","Jay","Zoom","Firestorm","Vibe","KillerFrost",
"GreenLantern","BlackCanary","Arsenal","Speedy","Deathstroke","Constantine","Zatanna","DoctorFate","Hawkman","Hawkgirl",
"Aquaman","Mera","OceanMaster","Aqualad","BlackManta","KingShark","Dolphin","Tempest","LagoonBoy","Topo"
]

vendor_ids = [f"VN{i:03d}" for i in range(1,11)]

for idx, name in enumerate(worker_names, start=1):
    vendor = vendor_ids[(idx - 1)//10]
    tenantName = "SHIELD" if vendor <= "VN005" else "ARGUS"
    tenantId = "ORG001" if tenantName == "SHIELD" else "ORG002"
    make_row(
        6,
        f"WK{idx:03d}",
        name,
        "Worker",
        tenantName,
        tenantId,
        "WORKER",
        vendor,
        vendor
    )

df = pd.DataFrame(rows)

output_path = "fencein_prisma_enterprise_dataset.csv"
df.to_csv(output_path, index=False)

print(f"CSV generated successfully with {len(df)} users.")
print(output_path)
