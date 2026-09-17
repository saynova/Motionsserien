with src(team_name, p1n, p1e, p2n, p2e) as (values
('Andhra Vikings','Mohammad Ifthequar Ali','mohammad00759@gmail.com','Narendra Nukarapu','nnk7863@gmail.com'),
('Baddfolk 2.0','Afaq Latif','afaq.latif@hitachienergy.com','Mohammad Osaid','mohammad.osaid@hitachienergy.com'),
('Comeback','Hugo Langanger','hugo.langanger1@hitachienergy.com','Henrik Wibling','Henrik.wibling@hitachienergy.com'),
('Desi divas','Attyia baig','attyiabaig@gmail.com','Jefferson dela cruz','jeffdelacruz9444@gmail.com'),
('Fjäderfäna','Kristina Ledin','kristina.ledin@gmail.com','Anita Kovacs','kovacs.anita.p@gmail.com'),
('Friskt Vågat','Mikael Burlin','mikael.burlin@hitachienergy.com','Johan Björklund','johan.o.bjorklund@hitachienergy.com'),
('GGG','Stefan Thidé','stefanthide@hotmail.com','Johan Serlander','johanserlander@hotmail.com'),
('Hällarna','Jonas Lindberg','jonas.lindberg@hitachienergy.com','Stig Pettersson','stig.a.pettersson@outlook.com'),
('Hum Tum','Krishna Earle','krishna.earle@hitachienergy.com','Praveen Barupati','Praveen.barupati@hitachienergy.com'),
('JAK & DM Smashers','Jojin Abraham Kottarathil','jojin-abraham.kottarathil@hitachienergy.com','Deepak Moothedath','deepak.moothedath@hitachienergy.com'),
('Kerala Blasters','Nikhil Joseph Ebi','nikhil.joseph-ebi@hitachienergy.com','Aravind Ravi','aravind.ravi@hitachienergy.com'),
('Kir','Patrik Jansson','patrik.jansson87@hotmail.com','Alexander Andersson','Alle.andersson@gmail.com'),
('Lightning Boys','Gokul Sidharth','saikishore.mohan@hitachienergy.com','Dinura Indumina','athula-kumara.gato-kandege@hitachienergy.com'),
('Lilla Grid','Tobias Langörgen','Tobias.langorgen@hitachienergy.com','Anton Eriksson','00Anton.eriksson@gmail.com'),
('Ludvika Smashers','Quasim Salami','qsalami@gmail.com','Hyder','md.hyder.ali@gmail.com'),
('Madbinton','Andreas Danielsson','andreas.p.danielsson@hitachienergy.com','Kristofer Karlström','kristofer.karlstrom@hitachienergy.com'),
('May Day','Vinothkannan','Vinothkannan.rajakannu@hitachienergy.com','Nizamudin','nizamudin.shaike@hitachienergy.com'),
('Örnbjörn','Glenn Strömberg','glennsepost@gmail.com','Mats Ramkvist','mats.ramkvist@hitachienergy.com'),
('Peboi','Pranav Sasitharan','pranavsasitharan08@gmail.com','Aswath Sasitharan','Peboibowpes@gmail.com'),
('Pumpa Gubbe','Per Winkler','per_winkler@hotmail.com','Andeds Norström','Anders0240@hotmail.com'),
('Punjab Power','Asad Javed','asad.javed@hitachienergy.com','Babar Ameen','babar.ameen@hitachienergy.com'),
('Reunion','Ville Pettersson','Villepettersson87@gmail.com','Oskar Langanger','Oskar.lnangros@gmail.com'),
('Side by Side','Shayan Masavalli Sangappagowda','shayan.masavalli-sangappagowda@hitachienergy.com','Varatharajan K','varatharajan.k@hitachienergy.com'),
('Sjukstugan','Jesper Falk','Jeppamedj@gmail.com','Johan Watz','watoz_86@hotmail.com'),
('Sokiyans','Athula Kumara','atkumara@gmail.com','Savinu Methsara','savinu2015@gmail.com'),
('Sundhlöfs','Fredrik Sundh','fredrik.sundh@gmail.com','Mats Löf','taximats@live.com'),
('SuperKings','P Chaitanya Kumar','justchaitu@gmail.com','goutam.som','goutam.som@hitachienergy.com'),
('The Legends','Md Rabiul Islam','mdrabiul.aiub@gmail.com','Janarthanan Veerasamy','janarthanan.veerasamy@hitachienergy.com'),
('Voltage Vectors','Arash Mazaheri','arash.mazaheri@hitachienergy.com','Rathish Pengadath','rathishonline@gmail.com'),
('WINTER STRIKERS','GINARAJ KG','ginaraj@gmail.com','NANDEESH G','nandeesh.g@hitachienergy.com')
)
insert into public.team_players (team_id, player_no, name, email)
select t.id, v.player_no, v.name, v.email
from src
join public.teams t on t.name = src.team_name
cross join lateral (values (1, src.p1n, src.p1e), (2, src.p2n, src.p2e)) as v(player_no, name, email)
where not exists (
  select 1 from public.team_players tp where tp.team_id = t.id and tp.player_no = v.player_no
);