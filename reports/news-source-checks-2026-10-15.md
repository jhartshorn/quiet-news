# News source checks — 15 October 2026

Tested from this Mac using the current app, not the deployed Raspberry Pi. Network responses can vary by location and over time. No sources were added to the live app.

The feed tests use the app’s actual HTTPS downloader and feed parser. Article tests use an isolated server and SQLite database: PUT saved state, GET saved results, GET reader, and repeat GET reader to verify cached text. These are endpoint tests, not a browser UI test. Three latest eligible entries were sampled from each usable feed; Al Jazeera also received three conventional news-article tests. Successful extraction was spot-checked using opening and ending blocks, but is not proof of complete article extraction.

Saved links worked for all 30 sampled entries. All 26 successful reader responses returned the same text when re-opened from cache. Saved text remains subject to the app’s 200-article cache cap.

| Source | Feed | Eligible entries | Reader extraction | Recommendation |
|---|---|---:|---|---|
| NPR | https://feeds.npr.org/1001/rss.xml | 10 | 2/3 extracted | Optional: U.S. reporting; audio-led stories may have insufficient text. |
| Al Jazeera | https://www.aljazeera.com/xml/rss/all.xml | 22 | 3/3 extracted | Optional: international and Middle East coverage. Video gives descriptions rather than video content; longform completeness is uncertain. |
| Ars Technica | https://feeds.arstechnica.com/arstechnica/index | 18 | 3/3 extracted | Recommend for technology and science; author bios/comment counts can remain. |
| BleepingComputer | https://www.bleepingcomputer.com/feed/ | 15 | 3/3 extracted | Recommend for cybersecurity; some promotional text remains. |
| ProPublica | https://www.propublica.org/feeds/propublica/main | 16 | 3/3 extracted | Recommend for U.S. investigations; donation text can remain. |
| PoliticsHome | https://www.politicshome.com/news/rss | 30 | 0/3 extracted | Feed usable, but use original-site links: all three reader extractions failed. |
| The Independent | https://www.independent.co.uk/news/uk/rss | — | Not tested (feed failed) | Do not add as-is: app received an unreadable/binary-looking feed response. Reader not tested. |
| The Telegraph | https://www.telegraph.co.uk/rss.xml | — | Not tested (feed failed) | Do not add this endpoint as-is: feed returned HTTP 402. Reader not tested; this does not establish article compatibility. |
| POLITICO Europe | https://www.politico.eu/feed/ | 10 | 3/3 extracted | Recommend for European institutions, diplomacy and policy; subscription products not tested. |
| City A.M. | https://www.cityam.com/feed/ | 24 | 3/3 extracted | Recommend for UK business and economic policy; broad feed can admit sports/culture stories despite app filters. |
| LocalGov | https://www.localgov.co.uk/rss | 20 | 3/3 extracted | Recommend for councils and local-government finance; some related/promotional content remains. |
| Civil Service World | https://www.civilserviceworld.com/news/rss | — | Not tested (feed failed) | Tested /news/rss endpoint returned HTTP 404; no claim that every possible feed is unavailable. |
| Al Jazeera news sample | https://www.aljazeera.com/xml/rss/all.xml | 22 | 3/3 extracted | Additional three ordinary news articles all extracted; stronger evidence for conventional articles than multimedia/longform. |

## Sample evidence

### NPR

- [Suspicious mailings to election officials, congressional offices under investigation](https://www.npr.org/2026/10/15/nx-s1-6003857/suspicious-mailings-election-congressional-offices): saved and retrieved = True; reader = extracted 3,080 characters; cached re-open passed.
- [U.S. historic preservation law faces the most serious threat in its 60-year history](https://www.npr.org/2026/10/15/nx-s1-6001504/section-106-historic-preservation-act-threats-anniversary): saved and retrieved = True; reader = extracted 13,189 characters; cached re-open passed.
- [Inside the race between Elon Musk and Jeff Bezos for control of outer space](https://www.npr.org/2026/10/15/nx-s1-6002922/inside-the-race-between-elon-musk-and-jeff-bezos-for-control-of-outer-space): saved and retrieved = True; reader = Only a short excerpt could be extracted..

### Al Jazeera

- [Will Israeli voters punish Benjamin Netanyahu?](https://www.aljazeera.com/video/inside-story/2026/10/15/will-israeli-voters-punish-benjamin-netanyahu?traffic_source=rss): saved and retrieved = True; reader = extracted 1,044 characters; cached re-open passed.
- [Dying in ICE custody: Inside one family’s story of heartbreak](https://www.aljazeera.com/news/longform/2026/10/15/dying-in-ice-custody-inside-one-familys-story-of-heartbreak?traffic_source=rss): saved and retrieved = True; reader = extracted 3,497 characters; cached re-open passed.
- [Ethiopian forces expand control in Tigray as militia claims Eritrean losses](https://www.aljazeera.com/news/2026/10/15/ethiopian-forces-expand-control-in-tigray-as-militia-claims-eritrean-losses?traffic_source=rss): saved and retrieved = True; reader = extracted 3,115 characters; cached re-open passed.

### Ars Technica

- [What did the Liberty Bell sound like? Science is on the case.](https://arstechnica.com/science/2026/10/what-did-the-liberty-bell-sound-like-science-is-on-the-case/): saved and retrieved = True; reader = extracted 5,857 characters; cached re-open passed.
- [Black Sea drone attacks enter NATO country's territorial waters for first time](https://arstechnica.com/gadgets/2026/10/black-sea-drone-attacks-enter-nato-countrys-territorial-waters-for-first-time/): saved and retrieved = True; reader = extracted 7,730 characters; cached re-open passed.
- [Microplastics in water aren’t inert and make damaging chemicals on their own](https://arstechnica.com/science/2026/10/microplastics-in-water-arent-inert-and-make-damaging-chemicals-on-their-own/): saved and retrieved = True; reader = extracted 7,791 characters; cached re-open passed.

### BleepingComputer

- [Android gets AI defenses against messaging scams, fake calls](https://www.bleepingcomputer.com/news/security/android-gets-ai-defenses-against-messaging-scams-fake-calls/): saved and retrieved = True; reader = extracted 3,036 characters; cached re-open passed.
- [Hackers hijack D-Link, Ubiquiti devices to resell your stolen bandwidth](https://www.bleepingcomputer.com/news/security/hackers-hijack-d-link-ubiquiti-devices-to-resell-your-stolen-bandwidth/): saved and retrieved = True; reader = extracted 2,662 characters; cached re-open passed.
- [Fake Arch Linux packages push malware with root privileges](https://www.bleepingcomputer.com/news/security/fake-arch-linux-packages-push-malware-with-root-privileges/): saved and retrieved = True; reader = extracted 3,225 characters; cached re-open passed.

### ProPublica

- [Trump Says the Border Is Secure. Texas Gov. Greg Abbott Keeps Declaring an Emergency.](https://www.propublica.org/article/greg-abbott-border-security-disaster-proclamation): saved and retrieved = True; reader = extracted 9,505 characters; cached re-open passed.
- [Frustrated by Losses in the Courts, Missouri Republicans Want to Change How Top Judges Are Selected](https://www.propublica.org/article/missouri-plan-judge-selection-republican-attacks): saved and retrieved = True; reader = extracted 9,527 characters; cached re-open passed.
- [These Women Were Trying to Escape Domestic Abuse. ICE Detained Them Instead.](https://www.propublica.org/article/domestic-violence-immigrant-victims-ice-detention): saved and retrieved = True; reader = extracted 28,476 characters; cached re-open passed.

### PoliticsHome

- [The Rundown Podcast: The Politics Of The Manchester City Charges](https://www.politicshome.com/news/article/rundown-podcast-politics-manchester-city-charges): saved and retrieved = True; reader = Could not identify the article text..
- [Ed Davey Under Pressure To Raise Game As MPs Signal Leadership Tensions Aren’t Over](https://www.politicshome.com/news/article/ed-davey-lib-dems-mps-signal-leadership-challenge-not-over): saved and retrieved = True; reader = Could not identify the article text..
- [Why Rent Controls Remain Controversial](https://www.politicshome.com/news/article/rent-controls-work-uk): saved and retrieved = True; reader = Could not identify the article text..

### The Independent

Feed failure: Feed parser error: binary-looking response rather than readable XML.


### The Telegraph

Feed failure: HTTP 402


### POLITICO Europe

- [Shorten EU budget to 3 or 4 years, Cyprus president tells POLITICO](https://www.politico.eu/article/eu-budget-cyprus-president-euco-summit-politico/): saved and retrieved = True; reader = extracted 2,344 characters; cached re-open passed.
- [‘No logic’: Finland slams Trump for siding with Putin against Ukraine](https://www.politico.eu/article/petteri-orpo-finland-slams-donald-trump-siding-with-vladimir-putin-against-ukraine/): saved and retrieved = True; reader = extracted 5,226 characters; cached re-open passed.
- [Macron warns EU leaders they need to agree budget by end of year](https://www.politico.eu/article/emmanuel-macron-euco-eu-leaders-they-need-budget-end-of-year/): saved and retrieved = True; reader = extracted 2,465 characters; cached re-open passed.

### City A.M.

- [Robert Jenrick hits out at Deloitte and KPMG over job cuts](https://www.cityam.com/robert-jenrick-hits-out-at-deloitte-and-kpmg-over-job-cuts/): saved and retrieved = True; reader = extracted 3,104 characters; cached re-open passed.
- [Fifa still refusing to share World Cup sell-off papers, says FA chair](https://www.cityam.com/fifa-still-refusing-to-share-world-cup-sell-off-papers-says-fa-chair/): saved and retrieved = True; reader = extracted 2,694 characters; cached re-open passed.
- [Lloyd’s underwriters seek to halt £45m legal cover for Petrofac bribery defendants](https://www.cityam.com/lloyds-underwriters-seek-to-halt-45m-legal-cover-for-petrofac-bribery-defendants/): saved and retrieved = True; reader = extracted 3,056 characters; cached re-open passed.

### LocalGov

- [Norfolk pension fund claws back £498m from US corporate giants](https://www.localgov.co.uk/Norfolk-pension-fund-claws-back-498m-from-US-corporate-giants/65099): saved and retrieved = True; reader = extracted 1,313 characters; cached re-open passed.
- [Rayner expected to send in commissioners to Bedford BC](https://www.localgov.co.uk/Rayner-expected-to-send-in-commissioners-to-Bedford-BC/65098): saved and retrieved = True; reader = extracted 1,889 characters; cached re-open passed.
- [Acoustic cameras trigger 334 fines for noisy drivers in Kensington and Chelsea](https://www.localgov.co.uk/Acoustic-cameras-trigger-334-fines-for-noisy-drivers-in-Kensington-and-Chelsea/65097): saved and retrieved = True; reader = extracted 970 characters; cached re-open passed.

### Civil Service World

Feed failure: HTTP 404


### Al Jazeera news sample

- [Ethiopian forces expand control in Tigray as militia claims Eritrean losses](https://www.aljazeera.com/news/2026/10/15/ethiopian-forces-expand-control-in-tigray-as-militia-claims-eritrean-losses?traffic_source=rss): saved and retrieved = True; reader = extracted 3,115 characters; cached re-open passed.
- [Ahead of US midterms, voters are frustrated with Trump, want change: Poll](https://www.aljazeera.com/news/2026/10/15/ahead-of-us-midterms-voters-are-frustrated-with-trump-want-change-poll?traffic_source=rss): saved and retrieved = True; reader = extracted 2,896 characters; cached re-open passed.
- [Trump ramps up third-country US deportations despite global rights outcry](https://www.aljazeera.com/news/2026/10/15/trump-ramps-up-third-country-us-deportations-despite-global-rights-outcry?traffic_source=rss): saved and retrieved = True; reader = extracted 4,635 characters; cached re-open passed.
