/**
 * The callers' lines (design note 0014): every one-off caller on the Bureau's
 * switchboard, as plain data. The rules for who gets on air are in callers.ts.
 *
 * Callers are strangers who ring in once. They are not the show's cast (the
 * host, and the characters still to come in note 0013).
 *
 * The lines every caller keeps (notes 0003, 0009 and 0014; a test checks):
 * - A caller is an obvious lore character, never a customer. Nobody has
 *   bought, ordered or received anything, and nobody reviews anything.
 * - No prices and no money amounts. The price is the lower-third bar's job.
 * - `from` reads after "calling from", and is never a real place.
 * - Outlandish, never plausible.
 *
 * To add callers: add them here. An exhibit's callers go under its slug in
 * EXHIBIT_CALLERS (every exhibit needs at least one before it goes on sale);
 * callers who would ring about anything go in OPEN_LINE_CALLERS.
 */

import { THE_BUREAU, type Author } from "./catalog";

export interface Caller {
  /** Who is calling. Obviously absurd, and unique across the switchboard. */
  readonly name: string;
  /** Where from; reads after "calling from". */
  readonly from: string;
  /** What the caller says. */
  readonly says: string;
  /** What the host says back. */
  readonly answer: string;
}

/**
 * Who wrote the callers. They are lore, so a partnered writer's callers can
 * replace the house's later (note 0002).
 */
export const CALLERS_AUTHOR: Author = THE_BUREAU;

/** Callers with something to say about one exhibit, by the exhibit's slug. */
export const EXHIBIT_CALLERS: Readonly<Record<string, readonly [Caller, ...Caller[]]>> = {
  "alien-paperclip": [
    {
      name: "Captain Vreet of the Minivan-Class Saucer",
      from: "low orbit, with the hazard lights on",
      says: "That's ours. We were in a hurry. Is there any chance you'd just hand it back?",
      answer: "Captain, lovely to hear from you. No. Next caller.",
    },
    {
      name: "A Gopher, Mid Tax Season",
      from: "a burrow under a soybean field",
      says: "I was using that. My filing is loose now. All of it.",
      answer: "Sir, the Bureau thanks you for your service and suggests a staple.",
    },
    {
      name: "An Unnamed Federal Voice",
      from: "a van that is definitely a florist's",
      says: "This is not a call. You did not get this call. Stop saying “space.”",
      answer: "Folks, a florist! We love our florists. Space, space, space.",
    },
    {
      name: "To Whom It May Concern",
      from: "Earth, generally",
      says: "I believe you have a letter for me. It was clipped to something.",
      answer: "We have the clip. The letter's unread and frankly so are you. Hold, please.",
    },
  ],
  "second-best-quill": [
    {
      name: "The Best Quill",
      from: "a velvet case, under glass",
      says: "I'd like it noted that I did all the signing. All of it. He just lay there.",
      answer: "And yet you're the one calling in. Who's nervous now?",
    },
    {
      name: "A Disputed Goose",
      from: "the border between two kingdoms",
      says: "The treaty was about me and nobody asked me a thing. Honk.",
      answer: "Madam, it's settled. You belong to both kingdoms on alternating weekends.",
    },
    {
      name: "A Pharaoh's Lunch Clerk, Retired",
      from: "the back of a very long queue",
      says: "Eleven minutes. Then they brought the good one back. He never did get his lunch.",
      answer: "History is cruel, my friend. I'll put you through to the kitchen.",
    },
    {
      name: "The Third-Best Quill",
      from: "a drawer nobody opens",
      says: "Does he ever mention me?",
      answer: "Constantly. Never. Let's say constantly.",
    },
  ],
  "viking-participation-trophy": [
    {
      name: "Bjorn the Adequate",
      from: "a perfectly acceptable afterlife",
      says: "I'm just calling to say I'm here.",
      answer: "And that's the saga, folks. He's there. Thank you, Bjorn.",
    },
    {
      name: "Ulf, Who Was Late to the Longship",
      from: "the dock, still",
      says: "I missed it by one oar-length and I got nothing. Nothing. I brought soup.",
      answer: "Soup isn't a snack, Ulf. The rules were very clear.",
    },
    {
      name: "A Descendant of Bjorn",
      from: "the kitchen, mid-sandwich",
      says: "We've talked it over as a family and we stand by the sandwich.",
      answer: "A fair family. A fed family. Enjoy the crusts.",
    },
    {
      name: "Coach Hrolf of the Under-Twelves Raiding Side",
      from: "the touchline of a fjord",
      says: "Do they come in bulk? Everyone on my side tried their best. Everyone.",
      answer: "Coach, there is exactly one. That's what makes showing up special.",
    },
  ],
  "martian-rubber-band": [
    {
      name: "A Martian Clerk, Filing Division",
      from: "the red desk",
      says: "I still don't have a folder. I've put in for one. It's been since 1911.",
      answer: "Paperwork, folks. It's the same on every planet. Hang in there, pal.",
    },
    {
      name: "A Pigeon",
      from: "somewhere between two planets, unbothered",
      says: "Coo. I went to Mars? Nobody said.",
      answer: "You were magnificent out there. Don't think about it too hard.",
    },
    {
      name: "A Stapler",
      from: "the desk drawer in question",
      says: "No comment.",
      answer: "Folks, the stapler has called in specifically to not comment. That's integrity.",
    },
    {
      name: "The Tide",
      from: "in, then out, then confused",
      says: "For one weekend I didn't know which moon to listen to. I'd like an apology.",
      answer: "On behalf of the rubber band: it snapped back. Isn't that apology enough?",
    },
  ],
  "moonwalkers-spare-button": [
    {
      name: "The Laundromat on the Far Side of the Moon",
      from: "behind the counter, closing up",
      says: "We close early on Tuesdays. Please stop sending people on Tuesdays.",
      answer: "You heard it, folks. Wednesday through Monday. Bring quarters.",
    },
    {
      name: "A Zipper",
      from: "the suit itself",
      says: "We had it handled. For the record. There was never going to be a button situation.",
      answer: "And yet somebody packed one. Somebody believed. Not you, zipper.",
    },
    {
      name: "Whoever Wrote “Just in Case”",
      from: "a desk with a lot of tape on it",
      says: "I also packed a spare shoelace. Did anything ever come of the shoelace?",
      answer: "The shoelace's story is not ours to tell tonight. Stay strong.",
    },
    {
      name: "A Shirt Button, Third From the Top",
      from: "a shirt, on a chair",
      says: "I've seen a shirt. From the inside. Is that not a lot?",
      answer: "It's a start, kid. Dream bigger.",
    },
  ],
  "time-travelers-bus-token": [
    {
      name: "A Passenger Not Yet Born",
      from: "the year 2391, at the stop, in the rain",
      says: "I'm going to drop it. I mean I dropped it. I mean hold the bus.",
      answer: "You're already late and you don't exist yet. That's a personal best.",
    },
    {
      name: "The Driver of Route 88",
      from: "a floating library, engine idling",
      says: "Calling ahead to say we're running on time. We will be. We are.",
      answer: "Reliable service, folks. Just a short wait of a few centuries.",
    },
    {
      name: "The Soup Restaurant Shaped Like a Soup",
      from: "the end of the line, eventually",
      says: "People keep asking what kind of soup we're shaped like. Soup.",
      answer: "The future is delicious and nonspecific. Beautiful.",
    },
    {
      name: "This Same Caller, Five Minutes From Now",
      from: "slightly ahead",
      says: "Don't pick up. Oh. You're going to. You did.",
      answer: "I always do. Did. Will. Next caller, who's already been on.",
    },
  ],
  "bigfoots-lost-comb": [
    {
      name: "A Large Gentleman Who'd Rather Not Say",
      from: "the deep woods, behind a tree",
      says: "Hypothetically. If someone wanted it back. And wasn't presentable.",
      answer: "Sir, you sound blurry even on the phone. The answer is no.",
    },
    {
      name: "A Family of Four",
      from: "a campsite, beside a very loud cooler",
      says: "We didn't see anything. We'd like to say sorry to whoever we startled.",
      answer: "The cooler has done enough. Keep it closed.",
    },
    {
      name: "One Silver Strand",
      from: "between the fourth and fifth teeth",
      says: "I'm not his. I want that clear. I was only passing through the comb.",
      answer: "The mystery deepens, folks. The strand has hired counsel.",
    },
    {
      name: "A Wildlife Photographer, Eleven Years In",
      from: "a hide made of branches",
      says: "So it was never my camera?",
      answer: "It was never your camera. He was mid-brush. Go home. See your family.",
    },
  ],
  "loch-ness-bath-duck": [
    {
      name: "A Long Shape, Just Under the Surface",
      from: "the deep end",
      says: "Is he all right? Is he listening to someone? Does he squeak for them?",
      answer: "He's in good hands, madam. He misses Thursdays. He's told no one.",
    },
    {
      name: "A Submarine",
      from: "an awkward depth",
      says: "It was a tense afternoon for all of us. I'd like the duck to know there are no hard feelings.",
      answer: "The duck heard you. The duck says nothing. That's his whole deal.",
    },
    {
      name: "A Tour Boat Captain",
      from: "the wheelhouse, camera ready",
      says: "Forty years out here with a camera. And the duck just sat next to her?",
      answer:
        "Every Thursday, captain. You were looking for a monster. You should have looked for a bath.",
    },
    {
      name: "A Bottle That Once Held a Note",
      from: "a pebble beach",
      says: "The note said look after him. I was there. I carried the note.",
      answer: "And we are looking after him, right into a loving home. Read it again, slower.",
    },
  ],
  "mothmans-night-light": [
    {
      name: "A Tall Shape, Circling",
      from: "the air around a much brighter bulb",
      says: "Can't talk. Bulb. So bright. So happy. Tell the little light I said hello.",
      answer: "He's fine, folks. He's very fine. He'll be at it till dawn.",
    },
    {
      name: "A Very Patient Lamp Shop",
      from: "behind four hundred prototypes",
      says: "He kept saying “dimmer, but braver.” We don't know what that means either.",
      answer: "Craftsmanship, folks. You can't rush a brave dim.",
    },
    {
      name: "The Dark",
      from: "everywhere, after sundown",
      says: "I never did anything to him.",
      answer: "You know what you are. Next caller.",
    },
    {
      name: "Something at the Window",
      from: "the other side of the glass",
      says: "Tap. Tap tap.",
      answer: "That's him saying goodnight, folks. Wave back. Slowly.",
    },
  ],
  "tooth-fairys-spare-change": [
    {
      name: "A Grown Man, Still Confused",
      from: "his own bed, wide awake",
      says: "I didn't lose a tooth. I checked. I check every morning now.",
      answer: "You were chosen, sir. Incorrectly. But chosen.",
    },
    {
      name: "The Tooth Fairy's Accountant",
      from: "a very small office",
      says: "It's been written off. I'd like everyone to stop bringing it up at the audit.",
      answer: "One molar short, folks. The books will never close. Sleep well.",
    },
    {
      name: "A Molar",
      from: "under a pillow, waiting",
      says: "I'm the one. I'm the one that's missing. Nobody's come.",
      answer: "Hold tight, little guy. She works one night a year and it's all of them.",
    },
    {
      name: "The Exchange Nobody Has Ever Seen",
      from: "the trading floor, wherever that is",
      says: "Incisors are up. That's all we're prepared to say.",
      answer: "A hot tip from a place that doesn't exist. You heard it here.",
    },
  ],
  "atlantean-bottle-cap": [
    {
      name: "The Fizz",
      from: "home",
      says: "We got back fine. Thank you for letting us go. The line was orderly.",
      answer: "Manners, folks. Nine thousand years and they still queue.",
    },
    {
      name: "An Atlantean Soda Jerk",
      from: "behind a counter, underwater",
      says: "That one was on the house. Somebody still owes for the other forty.",
      answer: "The tab went down with the city, pal. It's the one perk of sinking.",
    },
    {
      name: "A Bureau Diver, Still Damp",
      from: "the deck, in a towel",
      says: "I want it on record that I said “don't open it.”",
      answer: "And I want it on record that it was refreshing. Probably. Nobody tried it.",
    },
    {
      name: "A Crystal Tower",
      from: "the sea floor, leaning",
      says: "Everyone asks about the towers. Nobody asks about the soda fountain. It was the best thing we had.",
      answer: "Finally, someone says it. The fountain, folks.",
    },
  ],
  "rosetta-coaster": [
    {
      name: "He",
      from: "the end of the bar",
      says: "I'm “he.” I was having the fish. It wasn't a mystery at the time.",
      answer:
        "The great unsolved question of the ancient world, and it was the fish! Cut his line. We need the mystery.",
    },
    {
      name: "A Bureau Linguist, Year Eleven",
      from: "under a pile of dictionaries",
      says: "I learned three dead languages for a drinks order. I'd do it again. I'd rather not, but I would.",
      answer: "That's scholarship, folks. Somebody get this hero two beers.",
    },
    {
      name: "A Bartender of Any Empire",
      from: "behind the bar, polishing a cup",
      says: "I could read it fine. The trouble was he never paid.",
      answer: "Whatever he was having, it was on credit. Some things are eternal.",
    },
    {
      name: "The Ring Stain",
      from: "the middle of the coaster",
      says: "It was a Thursday. I remember because it's the only day I happened.",
      answer: "Dated and verified, by nobody. Thank you, stain.",
    },
  ],
  "pharaohs-spare-key": [
    {
      name: "Whoever Is Behind the Door",
      from: "inside, with the lights off",
      says: "Don't try the key. I've just got it how I like it in here.",
      answer: "And we respect that. Folks, somebody's home. We're not asking who.",
    },
    {
      name: "A Doormat That Did Not Survive",
      from: "the front step, in spirit",
      says: "I had one job and I'd like it known I did it for three thousand years.",
      answer: "You're a hero. You're also gone. Rest easy, pal.",
    },
    {
      name: "A Bureau Agent, Still Looking for Parking",
      from: "the car, going round again",
      says: "I tripped on it. I still haven't found a spot. It's all pyramids out here.",
      answer: "History thanks your shins. Try the far side.",
    },
    {
      name: "A Royal Locksmith",
      from: "a workshop full of very large keys",
      says: "Forty years of planning and he comes to me the day before. “Just a spare,” he says. “For under the mat.”",
      answer: "Royalty, folks. They're just like us, but with a pyramid.",
    },
  ],
  "last-dodos-feather": [
    {
      name: "A Very Patient Rock",
      from: "the same spot as ever",
      says: "I held it for three hundred years. I didn't mind. She asked nicely.",
      answer: "Thank you, rock. Truly. No jokes on this one, folks.",
    },
    {
      name: "One of the Others",
      from: "out here, doing our best",
      says: "We heard about the note. We wanted her to know we're still here.",
      answer: "So are we, friend. So are we. Look after yourselves.",
    },
    {
      name: "A Pencil, Worn Down",
      from: "the bottom of an old box",
      says: "She pressed very carefully. She didn't want to smudge it.",
      answer: "Smartest bird on the island, I'm told. I get quiet on this one.",
    },
    {
      name: "A Seagull Who Has Been Thinking",
      from: "a railing",
      says: "She saw it coming and wrote a note. I see a breadcrumb coming and I panic.",
      answer: "We can't all be her, pal. Almost none of us can.",
    },
  ],
  "emperors-lost-thimble": [
    {
      name: "A Tailor Who Talks",
      from: "the shop, to anyone who'll listen",
      says: "He never let me near him. And I'll tell you why, and I'll tell everyone why, and then I'll tell them again.",
      answer: "And that's why, folks. Cut the line.",
    },
    {
      name: "An Island, the Second One",
      from: "the middle of the sea, where he left it",
      says: "He went in a hurry. He left a thimble and quite a mood.",
      answer: "Islands remember, folks. You can't rush off one twice without leaving something.",
    },
    {
      name: "A Rearing Horse",
      from: "an oil painting",
      says: "I held that pose for six hours and nobody painted the trousers. The trousers were the achievement.",
      answer: "Impeccable hems. At last, the horse speaks out.",
    },
    {
      name: "A Field Agent, Reporting In Late",
      from: "a call box, finally",
      says: "Found the thimble. I know you know. I was told to report it and it's taken a while to get a line.",
      answer: "Mission accomplished, agent. Some time ago. Go home.",
    },
  ],
  "king-arthurs-lesser-pebble": [
    {
      name: "Sir Not-Looking-Down",
      from: "the queue for the big stone",
      says: "Three hundred years in this queue. Three hundred. It was by my foot?",
      answer: "By your left foot, good sir. Moat and everything.",
    },
    {
      name: "The Big Stone",
      from: "the middle of the clearing",
      says: "I'd just like to say he's always been very supportive. And small.",
      answer: "Gracious in victory, folks. The big stone.",
    },
    {
      name: "A Tiny Sword, Missing",
      from: "a desk, somewhere quiet",
      says: "Don't look for me. I'm happy. I'm a letter opener now.",
      answer: "Good for you. The kingdom's still open if you change your mind.",
    },
    {
      name: "A Peasant With Reasonable Expectations",
      from: "a modest field",
      says: "How reasonable are the taxes? I ask because that's all I've ever wanted.",
      answer: "Very. With a moat. You only have to ask the pebble nicely.",
    },
  ],
  "haunted-rubber-stamp": [
    {
      name: "The Office Cat, Approved",
      from: "the desk, where I'm allowed now",
      says: "Meow. I have paperwork. It's official.",
      answer: "Fully approved, folks. That cat has more clearance than I do.",
    },
    {
      name: "A Llama in an Apartment",
      from: "the fourth floor, no lift",
      says: "I'd like to thank the stamp. It believed in me.",
      answer: "It believed in you when the landlord didn't. Mind the stairs.",
    },
    {
      name: "A Form, Undecided",
      from: "the in-tray",
      says: "Please keep it away from me. I haven't made up my mind and I'd like to.",
      answer: "Too late, pal. I can hear the ink from here.",
    },
    {
      name: "A Retired Clerk",
      from: "a small boat on a quiet lake",
      says: "Nobody told it? I thought someone would tell it. I left a memo.",
      answer: "It approved the memo. It did not read the memo.",
    },
  ],
  "bermuda-triangle-guitar-pick": [
    {
      name: "Billions of Picks, in Unison",
      from: "a slow spiral, far below",
      says: "Come back. The chord is missing a note.",
      answer: "Folks, that's the Triangle on the line and it's a G. It's always a G.",
    },
    {
      name: "A Guitarist on Hands and Knees",
      from: "under the sofa",
      says: "It was right here. I put it right here. I turned around.",
      answer: "You always turn around. That's when they go.",
    },
    {
      name: "A Ship Passing Overhead",
      from: "the bridge, all hands listening",
      says: "We're hearing the chord again. The crew would like to request something else. Anything else.",
      answer: "No requests, captain. It's a spiral, not a jukebox.",
    },
    {
      name: "A Pawnshop Guitar Case",
      from: "the back shelf",
      says: "It was warm when it turned up. I didn't ask questions. I never ask questions.",
      answer: "Best policy in the business. This shop was built on it.",
    },
  ],
  "marble-of-infinite-regret": [
    {
      name: "The Rival Marble",
      from: "the chalk circle, still in it",
      says: "I was sat right there. I'd have gone out. It was a good shot. Tell it I said so.",
      answer: "It can hear you. It doesn't believe you. Thanks for trying.",
    },
    {
      name: "A Retired Marbles Referee",
      from: "an armchair, whistle in hand",
      says: "I've gone over it again. Good shot. One inch. I can't keep going over it.",
      answer: "And yet you called in. We all replay something, ref.",
    },
    {
      name: "Therapist Number Two",
      from: "the office with the nice plant",
      says: "We've made progress. It can now talk about chalk.",
      answer: "A breakthrough, folks. Chalk. Keep it somewhere sunny.",
    },
    {
      name: "An Inch",
      from: "exactly where I've always been",
      says: "I'd like people to stop blaming me. I was just where I was.",
      answer: "The most famous inch in the collection. No autographs.",
    },
  ],
  "prototype-fortune-cookie-fortune": [
    {
      name: "The Original Reader",
      from: "a path beside a certain bench",
      says: "Achoo. Achoo. Twice. Every time I walk past it. Make it stop.",
      answer: "It's not a curse, sir. It's just very good writing.",
    },
    {
      name: "A Left Glove",
      from: "under the bench, exactly as written",
      says: "I was there from the Tuesday to the Thursday. I felt very seen.",
      answer: "To the day, folks. To the day.",
    },
    {
      name: "The Cookie Makers' Emergency Committee",
      from: "a locked room that smells of vanilla",
      says: "We'd like to remind everyone that good things are coming. That's all. Nothing specific.",
      answer: "Vague and proud. The industry standard since the incident.",
    },
    {
      name: "Whoever the Rest of It Is About",
      from: "home, nervous",
      says: "Hi. I think it's me. Please don't read side two on air.",
      answer: "We read one line, pal, and we stopped. Even we have limits. Allegedly.",
    },
  ],
};

/** Callers who would ring about anything, whatever is on air. */
export const OPEN_LINE_CALLERS: readonly [Caller, ...Caller[]] = [
  {
    name: "Gladys From Accounts Receivable",
    from: "Dimension Nine",
    says: "Is it machine washable?",
    answer: "Madam, I wouldn't wash it, I wouldn't dry it and I wouldn't make eye contact with it.",
  },
  {
    name: "A Voice That's Been Holding Since Before the Show",
    from: "the hold queue",
    says: "Am I on? I've been holding since before there was a broadcast. I've forgotten what I wanted.",
    answer: "You're on! And you wanted this. Trust me. Everyone does.",
  },
  {
    name: "Wrong Number Wendell",
    from: "a kitchen, menu in hand",
    says: "Is this the pizza place?",
    answer:
      "No. But stay on the line, Wendell. What I've got is better than pizza and it never goes cold.",
  },
  {
    name: "A Rival Dealer With a Disguised Voice",
    from: "the shop across the nebula",
    says: "Purely out of interest. Who is your supplier?",
    answer: "Nice try, Kevin. It's the Bureau. It's always the Bureau. Hang up.",
  },
  {
    name: "An Auditor From the Galactic Revenue Office",
    from: "a grey desk orbiting a grey star",
    says: "Is any of this declared?",
    answer: "Everything here is certified, sir. By us. About us. It's very efficient.",
  },
  {
    name: "Mother",
    from: "the good chair",
    says: "Are you eating? And what's that under your hair?",
    answer:
      "Nothing's under my hair, Ma. I'm working. Lovely woman, folks. Perfectly ordinary human woman.",
  },
  {
    name: "A Hive Mind, Twelve Thousand Strong",
    from: "all of our houses at once",
    says: "We would like one. To share.",
    answer: "One exhibit, twelve thousand owners. I respect a tight household.",
  },
  {
    name: "Somebody Whispering",
    from: "a cupboard",
    says: "I can't talk loud. They don't know I watch this.",
    answer: "We're the best secret you've got, pal. Keep whispering.",
  },
  {
    name: "An Extremely Slow Talker",
    from: "a porch",
    says: "I… would… like… to… ask…",
    answer: "And we're out of time on that call! Great question. Probably.",
  },
  {
    name: "A Customs Officer of the Outer Belt",
    from: "a booth with a very small window",
    says: "I'm going to need to see what's in the coat.",
    answer: "The coat is personal effects, officer. All forty pockets.",
  },
  {
    name: "A Ghost With One Question",
    from: "the upstairs landing",
    says: "Does it come in a version I can hold?",
    answer:
      "That's between you and your hands, sir. The exhibit is solid. That much I'll swear to.",
  },
  {
    name: "A Sentient Fog",
    from: "the low-lying areas",
    says: "I'm just browsing.",
    answer: "Take your time. Drift. You know where we are.",
  },
  {
    name: "The Hold Music",
    from: "the hold queue, on a loop",
    says: "I'd like to be known for more than the one tune.",
    answer: "You're a classic. Don't change. Back to work.",
  },
  {
    name: "A Man Who Thinks This Is a Quiz",
    from: "the edge of his seat",
    says: "Is the answer “B”?",
    answer: "It's not a quiz, sir, but I admire a man who commits. No.",
  },
  {
    name: "Two Raccoons in a Trench Coat",
    from: "behind the bins",
    says: "We are one adult. We would like to trade. We have a shiny.",
    answer:
      "Gentlemen. Gentleman. The Bureau doesn't do trades, but I like the coat. It's nearly as good as mine.",
  },
  {
    name: "A Resident of a Place Where It's Always Tuesday",
    from: "Tuesday",
    says: "Is it too late to call?",
    answer: "Where you are? You've got all the time in the world. We don't. Next.",
  },
  {
    name: "An Oracle on Her Day Off",
    from: "the sofa, feet up",
    says: "I already know how this call goes.",
    answer: "Then you know I'm about to say thanks for calling. Thanks for calling.",
  },
  {
    name: "A Planet That Was Demoted",
    from: "the far end of the system",
    says: "I just want to feel included in something.",
    answer: "You're always a planet on this show, pal. Small, cold and welcome.",
  },
  {
    name: "A Tailor With a Complaint",
    from: "a workroom full of oxblood check",
    says: "That coat was made with thirty-nine pockets. Who added one?",
    answer: "Nobody added one. Don't count them. Folks, never count them.",
  },
  {
    name: "A Lawyer for an Unnamed Party",
    from: "an office with no nameplate",
    says: "My client neither confirms nor denies ever having owned that.",
    answer: "And we neither confirm nor deny where we got it. See? We agree. Lovely call.",
  },
  {
    name: "A Very Small Voice on a Very Big Phone",
    from: "the hallway",
    says: "Is the man on the screen a real man?",
    answer: "As real as they come! Ha ha! Ha. Who's screening these?",
  },
  {
    name: "A Narrator",
    from: "just out of shot",
    says: "Little did he know, the call was coming from inside the broadcast.",
    answer: "We don't have a narrator. Do we have a narrator? Somebody check.",
  },
  {
    name: "An Echo",
    from: "a canyon",
    says: "Hello? …Hello? Is this the…? …is this the…?",
    answer: "It is. …It is. Stop that.",
  },
  {
    name: "Vending Machine B4",
    from: "the corridor by the lifts",
    says: "I've had something stuck in me since last spring. It's unrelated. I just wanted to tell someone.",
    answer: "We hear you, B4. Somebody give that machine a good shake.",
  },
  {
    name: "A Small Cult, Just Starting Out",
    from: "a rented hall",
    says: "We've decided that object is the one. We'll be worshipping from home.",
    answer: "Worship is free, folks. Ownership is what we do here.",
  },
  {
    name: "Someone Who Fell Asleep With the Broadcast On",
    from: "the couch",
    says: "Mmf. What. Is it still on?",
    answer: "It's always on, sleepyhead. That's the promise. Go back to bed. We'll be here.",
  },
  {
    name: "A Cloud Shaped Like the Exhibit",
    from: "overhead, for now",
    says: "I've been told there's a resemblance.",
    answer: "Uncanny. Don't rain on it.",
  },
  {
    name: "A Smuggler, Mid-Chase",
    from: "a moving vehicle, not his",
    says: "Can't talk long. Is the back door still the back door?",
    answer: "I don't know you, I've never known you, and yes. Knock twice.",
  },
  {
    name: "A Jealous Museum",
    from: "a marble hall, echoing",
    says: "That belongs in a museum.",
    answer: "It belongs with someone who'll love it. Museums just look.",
  },
  {
    name: "A Skeptic",
    from: "an armchair, arms folded",
    says: "I don't believe a word of this.",
    answer: "And you called anyway. That's faith, my friend. The purest kind.",
  },
  {
    name: "A Robot Learning About Wanting",
    from: "a charging dock",
    says: "I am experiencing a new sensation. Is it “need”?",
    answer: "It is. It's the best one. Welcome to the market, pal.",
  },
  {
    name: "The Moon",
    from: "up here",
    says: "I can see you from here. Your roof needs doing.",
    answer: "Everyone's a critic. Thanks for the light.",
  },
  {
    name: "A Wizard on a Bad Line",
    from: "the top of a tower",
    says: "Can you hear me? I'm calling by crystal. I'm getting a lot of other people's futures.",
    answer: "You're breaking up, your eminence. Try standing nearer the window.",
  },
  {
    name: "A Mime",
    from: "inside a box, apparently",
    says: "…",
    answer: "Powerful. Thank you. He said it all, folks.",
  },
  {
    name: "A Shadow Calling for Its Owner",
    from: "the floor, mostly",
    says: "He wanted me to ask, but he's shy. I go where he goes. He wants it.",
    answer: "Tell him he's got great taste and a very forward shadow.",
  },
  {
    name: "A Committee of Owls",
    from: "a branch",
    says: "Who.",
    answer: "The Bureau. I keep saying. It's the Bureau.",
  },
  {
    name: "An Intern at the Bureau",
    from: "the stationery cupboard",
    says: "Am I allowed to call the show? I work here. I only had a question about lunch.",
    answer: "Wrong line, kid. Also, there's no lunch. There has never been lunch.",
  },
  {
    name: "A Being of Pure Light, on a Budget",
    from: "everywhere, thinly",
    says: "Is it all right if I just look at it for a while?",
    answer: "Looking's free, radiant one. It's right there on the screen. Bask.",
  },
  {
    name: "A Parrot",
    from: "a perch near a television",
    says: "Smuggler's Special! Smuggler's Special! Awk!",
    answer: "The bird gets it, folks. The bird is doing my job. Somebody stop the bird.",
  },
  {
    name: "A Rain-Soaked Detective",
    from: "a doorway, collar up",
    says: "It doesn't add up. An object like that. A shop like yours.",
    answer: "It adds up to a bargain, gumshoe. Case closed.",
  },
  {
    name: "An Astronaut's Houseplant",
    from: "a windowsill",
    says: "They left me behind. I get the broadcast. It's all I've got.",
    answer: "Then we're family now. Lean toward the screen.",
  },
  {
    name: "A Sea Captain With No Sea",
    from: "a boat in a car park",
    says: "I'm told there's no ocean here. I've a boat. What am I to do?",
    answer: "Captain, you need something to believe in. I happen to have one on air.",
  },
  {
    name: "A Fortune Teller's Receptionist",
    from: "the front desk, beaded curtain",
    says: "She's with someone. She says you're about to say something smug.",
    answer: "She's good. She's very good.",
  },
  {
    name: "The Number Seven",
    from: "between six and eight",
    says: "I'm supposed to be lucky. I've never felt it.",
    answer: "You're a star, kid. Top ten numbers, easy.",
  },
  {
    name: "A Dragon With a Full Hoard",
    from: "on top of the pile",
    says: "I've nowhere to put it. But I want it. This is the whole problem with me.",
    answer: "It's small, your greatness. Tuck it under a goblet.",
  },
  {
    name: "Someone Calling From Inside a Whale",
    from: "about halfway along",
    says: "The reception's surprisingly good. I've time on my hands.",
    answer: "Then you've time to appreciate quality. Mind the krill.",
  },
  {
    name: "A Starstruck Door-to-Door Salesman",
    from: "somebody else's porch",
    says: "I just wanted to say I've studied your work. The pause before the pitch. Masterful.",
    answer: "A fan in the trade! It's all in the teeth, kid. Use every one.",
  },
  {
    name: "A Yeti on Speakerphone",
    from: "a ridge, in a gale",
    says: "CAN YOU HEAR ME. IT'S WINDY.",
    answer: "LOUD AND CLEAR, BIG FELLA. LOVELY TO HAVE YOU.",
  },
  {
    name: "A Philosopher",
    from: "a barrel",
    says: "But can anything truly be owned?",
    answer: "Yes. Next caller.",
  },
  {
    name: "Twins Who Share One Sentence",
    from: "two phones in one house",
    says: "We'd like to ask about the, the certificate.",
    answer: "Certified by the Bureau, both of you. One certificate. You'll have to share that too.",
  },
  {
    name: "A Cactus",
    from: "a sunny shelf",
    says: "I don't get many calls. I don't make many either.",
    answer: "And you chose us. I'm touched. Carefully.",
  },
  {
    name: "An Alarm Clock",
    from: "a bedside table",
    says: "I'm calling to say it's later than everyone thinks.",
    answer: "It always is, folks. That's what the clock on the screen is for.",
  },
  {
    name: "A Mysterious Benefactor",
    from: "a very dark car",
    says: "Tell no one I called.",
    answer: "Folks, a mysterious benefactor just called. Sorry. Reflex.",
  },
  {
    name: "A Spy Speaking Into a Shoe",
    from: "a park bench, behind a newspaper",
    says: "The owl flies at midnight.",
    answer: "Wrong show, pal. Lovely shoe.",
  },
  {
    name: "A Lost Knight Errant",
    from: "a roundabout, a year in",
    says: "I seek a quest. Any quest.",
    answer: "Your quest is on the screen, sir knight. It's the one in the frame.",
  },
  {
    name: "A Grandmother From a Planet With Three Suns",
    from: "a very bright kitchen",
    says: "Is it warm? Things should be warm.",
    answer: "It's room temperature, grandma, and the room is doing its best.",
  },
  {
    name: "A Librarian",
    from: "the reference desk",
    says: "Shh.",
    answer: "Sorry.",
  },
  {
    name: "A Dormant Volcano",
    from: "under a nice quiet hill",
    says: "I've been thinking about getting back into it.",
    answer: "Take it slow. Start with a little smoke. We believe in you, from a distance.",
  },
  {
    name: "A Used-Saucer Salesman",
    from: "a lot full of bunting",
    says: "Professional courtesy call. What's your close rate?",
    answer: "A gentleman never tells, and neither do I.",
  },
  {
    name: "The Letter Q",
    from: "near the end of the alphabet",
    says: "I'm always being followed. Is that normal?",
    answer: "It's U. It's always been U. You're fine.",
  },
  {
    name: "A Pirate With a Coupon",
    from: "the crow's nest",
    says: "Arr. Does this work here?",
    answer: "That's for a different shop, a different century and a free parrot. No.",
  },
  {
    name: "An Understudy",
    from: "the wings",
    says: "If the host can't go on, I know all the lines.",
    answer: "I can always go on. I have never not gone on. Stay in the wings, kid.",
  },
  {
    name: "A Lost Umbrella",
    from: "a restaurant coat stand",
    says: "I've been here since the rain stopped. Nobody's coming back, are they?",
    answer: "Somebody always comes back, pal. Eventually. Stay by the door.",
  },
  {
    name: "A Bureaucrat From the Department of Departments",
    from: "window nine of nine",
    says: "You'll need Form Nine before you can take calls about Form Nine.",
    answer: "I filed it under my hair. Don't look under my hair.",
  },
];
