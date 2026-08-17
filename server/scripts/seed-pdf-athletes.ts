// @ts-nocheck
// Production Event & Combine Athletes Seeder (Remaining 200+ athletes)
import '../load-env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('postgres') ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

export const EVENT_ATHLETES = [
  {
    "name": "(10u) Derek",
    "email": "(10u).derek@example.com",
    "state": "CA"
  },
  {
    "name": "Lyla Casterline",
    "email": "lylacasterline@gmail.com",
    "state": "WA"
  },
  {
    "name": "Kaili Clarkson",
    "email": "shawnestypauu119@gmail.com",
    "state": "WA"
  },
  {
    "name": "Saniah Ellison-Barnett",
    "email": "saschaellison@yahoo.com",
    "state": "WA"
  },
  {
    "name": "Rylee Emerick",
    "email": "rylee.emerick@gmail.com",
    "state": "WA"
  },
  {
    "name": "Carrie Helman",
    "email": "carriesueh123@gmail.com",
    "state": "WA"
  },
  {
    "name": "Camille Lee",
    "email": "leesounyiam@gmail.com",
    "state": "WA"
  },
  {
    "name": "Amaiya Mason",
    "email": "gqmason28@gmail.com",
    "state": "WA"
  },
  {
    "name": "Sawyer Miller",
    "email": "sawyer.miller@example.com",
    "state": "WA"
  },
  {
    "name": "Aaliyah Nelson",
    "email": "aaliyahnelson17@icloud.com",
    "state": "WA"
  },
  {
    "name": "Madison Pepper",
    "email": "pepperfam4@gmail.com",
    "state": "WA"
  },
  {
    "name": "Addison Proctor",
    "email": "proctorsav@msn.com",
    "state": "WA"
  },
  {
    "name": "Angel Rhoads",
    "email": "angel.rhoads@icloud.com",
    "state": "WA"
  },
  {
    "name": "Emma Sajewski",
    "email": "sandra.sajewski@gmail.com",
    "state": "WA"
  },
  {
    "name": "Colby Sterrenburg",
    "email": "colbysterrenburg@gmail.com",
    "state": "WA"
  },
  {
    "name": "Bella Verbal",
    "email": "taverbal@yahoo.com",
    "state": "WA"
  },
  {
    "name": "Grace Weissman",
    "email": "dallas1985@hotmail.com",
    "state": "WA"
  },
  {
    "name": "Brooklin Whyte",
    "email": "tonimayr12@gmail.com",
    "state": "WA"
  },
  {
    "name": "Arianna Wicks",
    "email": "sammanthagomez1@gmail.com",
    "state": "WA"
  },
  {
    "name": "Jemma Yancey",
    "email": "jemma.yancey@icloud.com",
    "state": "WA"
  },
  {
    "name": "Sophia Sassi",
    "email": "m.sassi@hotmail.com",
    "state": "TN"
  },
  {
    "name": "Robin Mckissic",
    "email": "tnswty169@yahoo.com",
    "state": "TN"
  },
  {
    "name": "Eastyn Gooden",
    "email": "jpuddy3@gmail.com",
    "state": "TN"
  },
  {
    "name": "Autumn Kirkman",
    "email": "robiecheryl@gmail.com",
    "state": "TN"
  },
  {
    "name": "Olivia Proulx",
    "email": "estruthers@hotmail.com",
    "state": "TN"
  },
  {
    "name": "Bella Bruton",
    "email": "dcbrutonfam@gmail.com",
    "state": "TN"
  },
  {
    "name": "Hadley Moersdorf",
    "email": "hadley.moersdorf@example.com",
    "state": "TN"
  },
  {
    "name": "Aubrey Luker",
    "email": "bencini_amber@yahoo.com",
    "state": "TN"
  },
  {
    "name": "Alexa Proulx",
    "email": "erin99887@gmail.com",
    "state": "TN"
  },
  {
    "name": "Emma Archer",
    "email": "archerfam@comcast.net",
    "state": "TN"
  },
  {
    "name": "Nicole Smith-Harris",
    "email": "kittrins2@yahoo.com",
    "state": "TN"
  },
  {
    "name": "Aviana Combs",
    "email": "avianacombs@gmail.com",
    "state": "TN"
  },
  {
    "name": "Hollee Wilson",
    "email": "damonguillotte@icloud.com",
    "state": "TN"
  },
  {
    "name": "Chelsea Bucio-Ruiz",
    "email": "chelseabucioruiz@gmail.com",
    "state": "TN"
  },
  {
    "name": "Jaleia Newsom",
    "email": "tookiestouch@icloud.com",
    "state": "TN"
  },
  {
    "name": "Brynee Snow",
    "email": "dionne.snow@gmail.com",
    "state": "TN"
  },
  {
    "name": "Natalia Martinez",
    "email": "natalia.martinez@example.com",
    "state": "TX"
  },
  {
    "name": "Nailah Lampki",
    "email": "nailah.lampki@example.com",
    "state": "TX"
  },
  {
    "name": "Kaylie \"Paris\"",
    "email": "kaylie.\"paris\"@example.com",
    "state": "TX"
  },
  {
    "name": "Daphny Uluakiola",
    "email": "daphny.uluakiola@example.com",
    "state": "TX"
  },
  {
    "name": "Dream Zackery",
    "email": "dream.zackery@example.com",
    "state": "TX"
  },
  {
    "name": "Laniyah Jackson",
    "email": "laniyah.jackson@example.com",
    "state": "TX"
  },
  {
    "name": "Olivia Leota",
    "email": "olivia.leota@example.com",
    "state": "TX"
  },
  {
    "name": "Sulia Unga",
    "email": "sulia.unga@example.com",
    "state": "TX"
  },
  {
    "name": "Royal Beloch",
    "email": "royal.beloch@example.com",
    "state": "TX"
  },
  {
    "name": "Makiah Shields",
    "email": "makiah.shields@example.com",
    "state": "TX"
  },
  {
    "name": "Nailah Lampkin-Spearman",
    "email": "nailah.lampkin-spearman@example.com",
    "state": "TX"
  },
  {
    "name": "London Simpson",
    "email": "london.simpson@example.com",
    "state": "TX"
  },
  {
    "name": "Pakileata Tavo",
    "email": "dvtavo@gmail.com",
    "state": "TX"
  },
  {
    "name": "Taua’ana Duffy",
    "email": "taua’ana.duffy@example.com",
    "state": "TX"
  },
  {
    "name": "Carson Edmond",
    "email": "carson.edmond@example.com",
    "state": "TX"
  },
  {
    "name": "Sela Maafa",
    "email": "sela.maafa@example.com",
    "state": "TX"
  },
  {
    "name": "Nona Sika",
    "email": "nona.sika@example.com",
    "state": "TX"
  },
  {
    "name": "Suliana Vake",
    "email": "suliana.vake@example.com",
    "state": "TX"
  },
  {
    "name": "Mia Soliai",
    "email": "mia.soliai@example.com",
    "state": "TX"
  },
  {
    "name": "Kaydence Goodwin",
    "email": "kaydence.goodwin@example.com",
    "state": "TX"
  },
  {
    "name": "Xryia Grey",
    "email": "xryia.grey@example.com",
    "state": "TX"
  },
  {
    "name": "Lomen Taufa",
    "email": "lomen.taufa@example.com",
    "state": "TX"
  },
  {
    "name": "Aubriey Seau",
    "email": "aubriey.seau@example.com",
    "state": "TX"
  },
  {
    "name": "Ane Naupoto",
    "email": "ane.naupoto@example.com",
    "state": "TX"
  },
  {
    "name": "Heaven Snowden",
    "email": "heaven.snowden@example.com",
    "state": "TX"
  },
  {
    "name": "Mia Soliai-Tui**",
    "email": "mia.soliai-tui**@example.com",
    "state": "TX"
  },
  {
    "name": "Azzy Fonua",
    "email": "azzy.fonua@example.com",
    "state": "TX"
  },
  {
    "name": "Tia Lafeta",
    "email": "tia.lafeta@example.com",
    "state": "TX"
  },
  {
    "name": "Saraiah Sika",
    "email": "saraiah.sika@example.com",
    "state": "TX"
  },
  {
    "name": "Lome Taufa",
    "email": "lome.taufa@example.com",
    "state": "TX"
  },
  {
    "name": "Tehzrhe Falevai-Pesa",
    "email": "tehzrhe.falevai-pesa@example.com",
    "state": "TX"
  },
  {
    "name": "Malaika Fonua",
    "email": "malaika.fonua@example.com",
    "state": "TX"
  },
  {
    "name": "Lilly Cook",
    "email": "jessicacook83@gmail.com",
    "state": "NC"
  },
  {
    "name": "Avery Detenber",
    "email": "avdetenber@gmail.com",
    "state": "NC"
  },
  {
    "name": "Scotlyn Dunn",
    "email": "grdiiii@outlook.com",
    "state": "NC"
  },
  {
    "name": "Janelle Duval",
    "email": "clduval12@yahoo.com",
    "state": "NC"
  },
  {
    "name": "Greta Earnest",
    "email": "gretaearnest15@gmail.com",
    "state": "NC"
  },
  {
    "name": "Maizy Grivich",
    "email": "maizyg10@gmail.com",
    "state": "NC"
  },
  {
    "name": "Landry Johnson",
    "email": "landry29j@gmail.com",
    "state": "NC"
  },
  {
    "name": "Victoria Quintana",
    "email": "mnaeli@bellsouth.net",
    "state": "NC"
  },
  {
    "name": "Nyla Robinson-Partidge",
    "email": "nylarobinsonpartridge@gmail.com",
    "state": "NC"
  },
  {
    "name": "Kamryn Rose",
    "email": "kamrynamodio@gmail.com",
    "state": "NC"
  },
  {
    "name": "Eve Smith",
    "email": "obviouslyjen@gmail.com",
    "state": "NC"
  },
  {
    "name": "Taylin Celestin",
    "email": "drocelestin@gmail.com",
    "state": "FL"
  },
  {
    "name": "Brianna Rutecki",
    "email": "briannarutecki09@gmail.com",
    "state": "FL"
  },
  {
    "name": "Saia Jean-Pierre",
    "email": "saia.jean-pierre@example.com",
    "state": "FL"
  },
  {
    "name": "Alissah Bennett",
    "email": "reallyman2005@gmail.com",
    "state": "FL"
  },
  {
    "name": "Zahara Leaks",
    "email": "shanquan.gibson@gmail.com",
    "state": "FL"
  },
  {
    "name": "Catie Molnar",
    "email": "j.molnar2208@gmail.com",
    "state": "FL"
  },
  {
    "name": "Briana Bogan",
    "email": "thumbave@gmail.com",
    "state": "FL"
  },
  {
    "name": "Melina Pickard",
    "email": "mcpick09@gmail.com",
    "state": "FL"
  },
  {
    "name": "Kiersten Cawley",
    "email": "cawleyjanet@gmail.com",
    "state": "FL"
  },
  {
    "name": "Torri Cotman",
    "email": "tcnena007@gmail.com",
    "state": "FL"
  },
  {
    "name": "Camila Perez",
    "email": "cjlo30@hotmail.com",
    "state": "FL"
  },
  {
    "name": "Eraydy De",
    "email": "eraydydepena@gmail.com",
    "state": "FL"
  },
  {
    "name": "Mackenzie Heggie",
    "email": "mheggie2@yahoo.com",
    "state": "FL"
  },
  {
    "name": "Maelanie Martell",
    "email": "martelldalayne800@gmail.com",
    "state": "FL"
  },
  {
    "name": "Brielle Matheis",
    "email": "vmatheis@miamigov.com",
    "state": "FL"
  },
  {
    "name": "Savannah Linders",
    "email": "larmstr7@aol.com",
    "state": "FL"
  },
  {
    "name": "Madeline Quintana",
    "email": "madeline106@gmail.com",
    "state": "FL"
  },
  {
    "name": "Dior Recarte",
    "email": "happyworld47@yahoo.com",
    "state": "FL"
  },
  {
    "name": "Avani Smith",
    "email": "avani.smith25@hmail.com",
    "state": "FL"
  },
  {
    "name": "Caitlin Taylor",
    "email": "angela15@netzero.net",
    "state": "FL"
  },
  {
    "name": "Alayah Akhdar",
    "email": "alayah.akhdar@example.com",
    "state": "FL"
  },
  {
    "name": "Brooke Eriksson",
    "email": "anders.eriksson@mac.com",
    "state": "FL"
  },
  {
    "name": "Jahkeriyah Brown",
    "email": "jahkeriyah.brown@example.com",
    "state": "FL"
  },
  {
    "name": "Kaci Chambers",
    "email": "ashleyangelval@gmail.com",
    "state": "FL"
  },
  {
    "name": "Madeline Ojeda",
    "email": "madeline.ojeda@example.com",
    "state": "FL"
  },
  {
    "name": "Annabella Barger",
    "email": "abarger3037@gmail.com",
    "state": "FL"
  },
  {
    "name": "Daniella Masongsong",
    "email": "heacro@yahoo.com",
    "state": "FL"
  },
  {
    "name": "Vanesa Montalvan",
    "email": "onipou@gmail.com",
    "state": "FL"
  },
  {
    "name": "Rakyia Louis",
    "email": "rakyialouis1@gmail.com",
    "state": "FL"
  },
  {
    "name": "Ailea Monteagudo",
    "email": "monteagudoailea142@gmail.com",
    "state": "FL"
  },
  {
    "name": "Destiny Taylor",
    "email": "summeralouis@yahoo.com",
    "state": "FL"
  },
  {
    "name": "Danielle Ortega",
    "email": "leyanisgomez@yahoo.com",
    "state": "FL"
  },
  {
    "name": "Takaylah Strowbridge",
    "email": "cleveena@aol.com",
    "state": "FL"
  },
  {
    "name": "Kayleigh Wallace",
    "email": "rikkibraton42@gmail.com",
    "state": "FL"
  },
  {
    "name": "Kiani Graham",
    "email": "ms.smart305@yahoo.com",
    "state": "FL"
  },
  {
    "name": "Dezaria Hampton",
    "email": "dezaria.hampton@example.com",
    "state": "FL"
  },
  {
    "name": "Maja Varhalmi",
    "email": "jathlet@gmail.com",
    "state": "FL"
  },
  {
    "name": "Alexia Gamboa",
    "email": "sherimtg@gmail.com",
    "state": "FL"
  },
  {
    "name": "Mi’laysiah Hall",
    "email": "kadedra_johnson@yahoo.com",
    "state": "FL"
  },
  {
    "name": "Malaiyah Smith",
    "email": "smith.daquaisha@gmail.com",
    "state": "FL"
  },
  {
    "name": "London Green",
    "email": "greenenicole875@gmail.com",
    "state": "FL"
  },
  {
    "name": "Landon Balfour",
    "email": "toytoylah85@gmail.com",
    "state": "FL"
  },
  {
    "name": "Nevaeh Mcneil",
    "email": "chiquita_mcneil@yahoo.com",
    "state": "FL"
  },
  {
    "name": "Jahzara Forbes",
    "email": "jahzara.forbes@example.com",
    "state": "FL"
  },
  {
    "name": "Aaliyah Davis",
    "email": "sharon.allen@copbfl.com",
    "state": "FL"
  },
  {
    "name": "Adrianna Dimuro-Malusky",
    "email": "janessamalusky@gmail.com",
    "state": "FL"
  },
  {
    "name": "Irelynn Anderson",
    "email": "bernadettea1531@gmail.com",
    "state": "FL"
  },
  {
    "name": "Amani Johnson",
    "email": "alexisjohnson900@gmail.com",
    "state": "FL"
  },
  {
    "name": "Leah Cartaya",
    "email": "gemacartaya@icloud.com",
    "state": "FL"
  },
  {
    "name": "Skylar Collier",
    "email": "sharon.allen@copbfl.com",
    "state": "FL"
  },
  {
    "name": "Brooklyn Dates",
    "email": "davisa2010@gmail.com",
    "state": "FL"
  },
  {
    "name": "Mega Bynum",
    "email": "lrjtranspo45@gmail.com",
    "state": "FL"
  },
  {
    "name": "Bailey Carter",
    "email": "nickrich1220@gmail.com",
    "state": "GA"
  },
  {
    "name": "Marleigh Grace",
    "email": "marleighgrace7@gmail.com",
    "state": "GA"
  },
  {
    "name": "Cheyenne Rias",
    "email": "cheyennerias2020@gmail.com",
    "state": "GA"
  },
  {
    "name": "Madison Bennett",
    "email": "madison.bennett1@myyahoo.com",
    "state": "GA"
  },
  {
    "name": "Desiya Rhodes",
    "email": "desiyarhodes0@gmail.com",
    "state": "GA"
  },
  {
    "name": "Aliceson Lewis",
    "email": "manuel.lewis.che@gmail.com",
    "state": "GA"
  },
  {
    "name": "Madeline Harden",
    "email": "mgharden08@gmail.com",
    "state": "GA"
  },
  {
    "name": "Peyton Fountain",
    "email": "mwashin@hotmail.com",
    "state": "GA"
  },
  {
    "name": "Kennedy Hayes",
    "email": "kenkumari08@gmail.com",
    "state": "GA"
  },
  {
    "name": "Aubrey Clements",
    "email": "aclements4444@gmail.com",
    "state": "GA"
  },
  {
    "name": "Taylor Relliford",
    "email": "taylorrelliford@icloud.com",
    "state": "GA"
  },
  {
    "name": "Toriann Lyttle",
    "email": "toriann.lyttle@example.com",
    "state": "GA"
  },
  {
    "name": "Alyssa Abraham",
    "email": "sheanace@yahoo.com",
    "state": "GA"
  },
  {
    "name": "Jaida Campbell",
    "email": "campbell.ericac@gmail.com",
    "state": "GA"
  },
  {
    "name": "Aubrey Weekes",
    "email": "aubreypweekes@gmail.com",
    "state": "GA"
  },
  {
    "name": "EMMETT WILLIAMS",
    "email": "emmett.williams@example.com",
    "state": "CA"
  },
  {
    "name": "AILYN MANZO",
    "email": "ailyn.manzo@example.com",
    "state": "CA"
  },
  {
    "name": "AKAILA MARTINEZ",
    "email": "akaila.martinez@example.com",
    "state": "CA"
  },
  {
    "name": "ANAYA RUSH",
    "email": "anaya.rush@example.com",
    "state": "CA"
  },
  {
    "name": "AKIANNAH VASQUEZ",
    "email": "akiannah.vasquez@example.com",
    "state": "CA"
  },
  {
    "name": "JOURNEE ROSS",
    "email": "journee.ross@example.com",
    "state": "CA"
  },
  {
    "name": "LEIGHTON HOECKELMANN",
    "email": "leighton.hoeckelmann@example.com",
    "state": "CA"
  },
  {
    "name": "LEYNA TORRES",
    "email": "leyna.torres@example.com",
    "state": "CA"
  },
  {
    "name": "ALYNA GREGORIO",
    "email": "alyna.gregorio@example.com",
    "state": "CA"
  },
  {
    "name": "GISSELLE MUNOZ",
    "email": "gisselle.munoz@example.com",
    "state": "CA"
  },
  {
    "name": "RAYDNN LEE",
    "email": "raydnn.lee@example.com",
    "state": "CA"
  },
  {
    "name": "DEREK FERRELL",
    "email": "derek.ferrell@example.com",
    "state": "CA"
  },
  {
    "name": "RON GIBBS",
    "email": "ron.gibbs@example.com",
    "state": "CA"
  },
  {
    "name": "ZARIAH FERRELL",
    "email": "zariah.ferrell@example.com",
    "state": "CA"
  },
  {
    "name": "AUBREE SALMOND",
    "email": "aubree.salmond@example.com",
    "state": "CA"
  },
  {
    "name": "SOPHIA MARSHALL",
    "email": "sophia.marshall@example.com",
    "state": "CA"
  },
  {
    "name": "LANIA THOMAS",
    "email": "lania.thomas@example.com",
    "state": "CA"
  },
  {
    "name": "TIFFANY KEOVORABOUTH",
    "email": "tiffany.keovorabouth@example.com",
    "state": "CA"
  },
  {
    "name": "NIAMAE HARRISON",
    "email": "niamae.harrison@example.com",
    "state": "CA"
  },
  {
    "name": "CARLY FORERO",
    "email": "carly.forero@example.com",
    "state": "CA"
  },
  {
    "name": "KALOI DUHART",
    "email": "kaloi.duhart@example.com",
    "state": "CA"
  },
  {
    "name": "KARINA THOMAS",
    "email": "karina.thomas@example.com",
    "state": "CA"
  },
  {
    "name": "RYLEI LEE",
    "email": "rylei.lee@example.com",
    "state": "CA"
  },
  {
    "name": "SAMIYA DAVIS",
    "email": "samiya.davis@example.com",
    "state": "CA"
  },
  {
    "name": "MALAYAH HENDERSON",
    "email": "malayah.henderson@example.com",
    "state": "CA"
  },
  {
    "name": "LONDYNN BROWN",
    "email": "londynn.brown@example.com",
    "state": "CA"
  },
  {
    "name": "KIYOKA BOURKE",
    "email": "kiyoka.bourke@example.com",
    "state": "CA"
  },
  {
    "name": "KRISTEN THOMAS",
    "email": "kristen.thomas@example.com",
    "state": "CA"
  },
  {
    "name": "DEMARIO MACLIN",
    "email": "demario.maclin@example.com",
    "state": "CA"
  },
  {
    "name": "LUCIANA THOMAS",
    "email": "luciana.thomas@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors EMANI",
    "email": "seniors.emani@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors DANICA",
    "email": "seniors.danica@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors SAMAYA",
    "email": "seniors.samaya@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors LONDYNN",
    "email": "seniors.londynn@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors ZARIAH",
    "email": "seniors.zariah@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors KIYOKA",
    "email": "seniors.kiyoka@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors KHALIA",
    "email": "seniors.khalia@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors MALAYAH",
    "email": "seniors.malayah@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors SHARIYAH",
    "email": "seniors.shariyah@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors SAVANNAH",
    "email": "seniors.savannah@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors SIENA",
    "email": "seniors.siena@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors LIAH",
    "email": "seniors.liah@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors JUSTICE",
    "email": "seniors.justice@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors SERENITY",
    "email": "seniors.serenity@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors AUBRIANNA",
    "email": "seniors.aubrianna@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors KAITLYN",
    "email": "seniors.kaitlyn@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors ARIANNA",
    "email": "seniors.arianna@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors MARYIAH",
    "email": "seniors.maryiah@example.com",
    "state": "CA"
  },
  {
    "name": "Seniors Hayden",
    "email": "abigaildjerig@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Berlin",
    "email": "berlinlavers@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Dayanna",
    "email": "dayannag168@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Natalie",
    "email": "nataliehazelwood08@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Jade",
    "email": "jadepele3@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Melody",
    "email": "efarris04@yahoo.com",
    "state": "CA"
  },
  {
    "name": "Seniors Michaela",
    "email": "michaela09brown@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Lori",
    "email": "jadepele3@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Charlotte",
    "email": "charlottebklaus@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Abigail",
    "email": "abigailmeehan771@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Destiny",
    "email": "heather.starr.edwards5@gmail.com",
    "state": "CA"
  },
  {
    "name": "Seniors Milena",
    "email": "connery_shayna@yahoo.com",
    "state": "CA"
  },
  {
    "name": "Seniors Allicia",
    "email": "msbrown4588@gmail.com",
    "state": "CA"
  },
  {
    "name": "Lela Sakura",
    "email": "ishibashi@hotmail.com",
    "state": "CA"
  },
  {
    "name": "Capri Collins",
    "email": "rebekahjerig@gmail.com",
    "state": "CA"
  },
  {
    "name": "lelani **",
    "email": "lelani.**@example.com",
    "state": "CA"
  },
  {
    "name": "Addy **",
    "email": "addy.**@example.com",
    "state": "CA"
  },
  {
    "name": "lucia **",
    "email": "lucia.**@example.com",
    "state": "CA"
  },
  {
    "name": "Paige **",
    "email": "paige.**@example.com",
    "state": "CA"
  }
];

async function seedPdfAthletes() {
  console.log(`🌱 Seeding ${EVENT_ATHLETES.length} athletes...`);
  let count = 0;

  for (const a of EVENT_ATHLETES) {
    const normalEmail = a.email.toLowerCase().trim();
    const existingPlayer = await db.select().from(schema.players).where(eq(schema.players.email, normalEmail)).limit(1);

    const preferences = {
      verifiedCombine: true,
      eventCohort: 'CA_COMBINE_2026',
    };

    let playerId: number;

    if (existingPlayer.length > 0) {
      playerId = existingPlayer[0].id;
      await db.update(schema.players).set({
        verificationStatus: 'verified',
        emailVerified: true,
        g5Rating: count < 25 ? 5 : (count < 100 ? 4 : 3),
        xpPoints: 1000 - count,
        state: existingPlayer[0].state || a.state,
        preferences: { ...(existingPlayer[0].preferences || {}), ...preferences },
      }).where(eq(schema.players.id, playerId));
      count++;
    } else {
      const [inserted] = await db.insert(schema.players).values({
        email: normalEmail,
        name: a.name,
        state: a.state,
        g5Rating: count < 25 ? 5 : (count < 100 ? 4 : 3),
        xpPoints: 1000 - count,
        verificationStatus: 'verified',
        emailVerified: true,
        preferences,
      }).returning();
      playerId = inserted.id;
      count++;
    }
  }

  console.log(`✅ Successfully seeded ${count} new athletes (${EVENT_ATHLETES.length} total processed)!`);
  process.exit(0);
}

seedPdfAthletes().catch(console.error);
