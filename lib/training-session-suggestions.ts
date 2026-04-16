import type { TrainingSession, TrainingSessionDrill } from '@/lib/types';

type SuggestedSessionStructure = {
  focus: string;
  isSuggested: boolean;
  runPlan: TrainingSessionDrill[];
};

type TrainingTemplate = {
  focus: string;
  progressionNotes: [string, string, string];
  runPlan: Array<{
    title: string;
    durationMinutes: number;
    description: string;
    coachingPoints: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
      caption: string;
    }>;
  }>;
};

const TRAINING_TEMPLATE_LIBRARY: TrainingTemplate[] = [
  {
    focus:
      'Build basic kicking mechanics first: balanced stance, ball drop, eyes up, and finishing every rep with a clear target call.',
    progressionNotes: [
      'Keep pressure low so players can find clean technique and confidence.',
      'Add light pressure and make players scan for a safer option before they kick.',
      'Keep technique under fatigue by demanding quick reset runs and repeat efforts between kicks.',
    ],
    runPlan: [
      {
        title: 'Players’ choice touch game',
        durationMinutes: 10,
        description:
          'Open with a simple self-directed touch game so players are active straight away and begin the session with fun and autonomy.',
        coachingPoints:
          'No lines, lots of touches, encourage talk and movement before we coach anything technical.',
      },
      {
        title: 'Prep-to-Play dynamic warm-up',
        durationMinutes: 10,
        description:
          'Use the Prep-to-Play warm-up as the energiser block, building movement quality, deceleration, landing shape, and readiness for footy movement.',
        coachingPoints:
          'Quality of movement matters more than speed early; own body position, hips, knees, and trunk control.',
        media: [
          {
            type: 'video',
            url: 'https://play.afl/video/prep-play-dynamic-warm',
            caption: 'Official Prep-to-Play dynamic warm-up reference.',
          },
        ],
      },
      {
        title: 'Tennis Ball Challenge and partner kicking',
        durationMinutes: 15,
        description:
          'Players work in pairs to groove a steady ball drop, straight line to target, and clean follow-through before increasing distance.',
        coachingPoints:
          'Hold the ball over the kicking foot, guide the drop, point hips and shoulders at the target, and finish balanced.',
      },
      {
        title: 'Scanning for the free player',
        durationMinutes: 15,
        description:
          'Small overload kicking game where the ball carrier must find the safe option and hit a short target with control.',
        coachingPoints:
          'Scan before possession, call names, favour the simple kick, and move after disposal to support the next pass.',
      },
      {
        title: 'Precise kicking game',
        durationMinutes: 15,
        description:
          'Finish with a narrow-sided game that rewards accurate passing and a composed kick inside 30 metres.',
        coachingPoints:
          'Technique before power, reward the player who lowers the eyes, and stop the group briefly to celebrate clean mechanics.',
      },
    ],
  },
  {
    focus:
      'Teach confident handball on both sides with quick hands, strong targets, and immediate support after release.',
    progressionNotes: [
      'Start with stationary technique before adding any chase pressure.',
      'Progress into moving handball and force players to use their non-preferred side under mild pressure.',
      'Raise tempo with repeat handball chains and short recovery windows to build work rate.',
    ],
    runPlan: [
      {
        title: 'Cross the River',
        durationMinutes: 10,
        description:
          'Competitive handball race where pairs must advance the ball with quick give-and-go movement against a live opponent.',
        coachingPoints:
          'Strong punching hand, stable guide hand, present a target early, and move immediately after releasing.',
      },
      {
        title: 'Prep-to-Play dynamic warm-up',
        durationMinutes: 10,
        description:
          'Run the dynamic warm-up, then add short reaction movements that finish with a clean handball receive.',
        coachingPoints:
          'Stay light on your feet, keep hips low, and own the first two steps into the receive.',
        media: [
          {
            type: 'video',
            url: 'https://play.afl/video/prep-play-dynamic-warm',
            caption: 'Use the official warm-up sequence before the skill block.',
          },
        ],
      },
      {
        title: 'Outnumbered handball grid',
        durationMinutes: 15,
        description:
          'Attackers keep possession in a small grid while working both left and right-hand handballs to escape pressure.',
        coachingPoints:
          'Punch through the ball, hit the receiver out in front, and stay connected as a support triangle.',
      },
      {
        title: 'Directional handball',
        durationMinutes: 15,
        description:
          'Players handball through gates in one direction, then instantly turn to defend or support the next wave.',
        coachingPoints:
          'Use two hands on the catch, separate quickly, and make the next decision before the ball arrives.',
      },
      {
        title: 'Endzone possession game',
        durationMinutes: 15,
        description:
          'Small-sided game with scoring only after a chain of handballs into the endzone, rewarding support and quick release.',
        coachingPoints:
          'Talk early, keep width, and reward the player who creates the next option rather than overholding the ball.',
      },
    ],
  },
  {
    focus:
      'Improve clean ground-ball pickup, first possession under pressure, and a composed first give by hand or foot.',
    progressionNotes: [
      'Start with obvious, rolling-ball cues and low contact pressure.',
      'Add front-on pressure and contested pickups where players must protect the ball and make a first decision.',
      'Force repeat pickups at game pace so technique survives fatigue and rising contact.',
    ],
    runPlan: [
      {
        title: 'Goalie ground-ball game',
        durationMinutes: 10,
        description:
          'Fun chase-and-recover game where players repeatedly attack a loose ball from different starting angles.',
        coachingPoints:
          'Lower hips, get eyes over the ball, arrive with small steps, and secure first before trying to burst away.',
      },
      {
        title: 'Prep-to-Play ground ball technique',
        durationMinutes: 10,
        description:
          'Review safe and efficient ground-ball body shape using the Prep-to-Play contested skill cues.',
        coachingPoints:
          'Protect the head and shoulders, stay strong through contact, and brace through the core before first possession.',
        media: [
          {
            type: 'video',
            url: 'https://play.afl/video/prep-play-ground-ball',
            caption: 'Official Prep-to-Play ground ball reference for safe contested technique.',
          },
        ],
      },
      {
        title: 'Repeated ground balls to handball release',
        durationMinutes: 15,
        description:
          'Players attack a loose ball, secure it, and release to a support player with a quick, accurate handball.',
        coachingPoints:
          'Win the ball first, protect it, then separate and release without panicking.',
      },
      {
        title: 'Escape and use the loose player',
        durationMinutes: 15,
        description:
          'Small contest where the first possession player must evade light pressure and find the spare teammate.',
        coachingPoints:
          'Win the hips, use one change of direction, and trust the first safe option.',
      },
      {
        title: 'Coast to coast',
        durationMinutes: 15,
        description:
          'Transition game beginning from a ground-ball contest and finishing with a controlled attack to space.',
        coachingPoints:
          'First possession sets the play; attack the loose ball, then spread fast and reward support runners.',
      },
    ],
  },
  {
    focus:
      'Teach marking basics and aerial confidence, then connect that to simple support and safer exits after the mark.',
    progressionNotes: [
      'Begin with unopposed catches and predictable flight to build confidence.',
      'Introduce mild body pressure and reward the first clean mark rather than the spectacular one.',
      'Challenge players to mark, land balanced, and transition quickly into the next decision.',
    ],
    runPlan: [
      {
        title: 'Magic Marks',
        durationMinutes: 10,
        description:
          'Light competitive marking game that encourages players to explore different catches and body positions.',
        coachingPoints:
          'Move early to the drop zone, hands high and late, and land balanced ready for the next action.',
      },
      {
        title: 'Prep-to-Play aerial contest',
        durationMinutes: 10,
        description:
          'Use the Prep-to-Play aerial contest cues to show safe take-off, body positioning, and landing in contact situations.',
        coachingPoints:
          'Protect yourself and your opponent, eyes on the ball, strong core, and own the landing.',
        media: [
          {
            type: 'video',
            url: 'https://play.afl/video/prep-play-aerial-contest',
            caption: 'Official Prep-to-Play aerial contest technique reference.',
          },
        ],
      },
      {
        title: 'Outnumbered marking game',
        durationMinutes: 15,
        description:
          'Attackers work for front-and-centre and leading marks in an overload, keeping the contest manageable for beginners.',
        coachingPoints:
          'Call early, attack the drop, and if you don’t mark, become the support or crumb player immediately.',
      },
      {
        title: 'Back-end kicking after the mark',
        durationMinutes: 15,
        description:
          'Players mark, steady, and pick the safest kick option while teammates create width and support.',
        coachingPoints:
          'Secure the mark first, reset your feet, and reward the short safe option before the long hopeful one.',
      },
      {
        title: 'Zone football',
        durationMinutes: 15,
        description:
          'Small-sided game rewarding clean marks and smart spacing rather than just long kicks to congestion.',
        coachingPoints:
          'Move to create space, communicate, and understand what a good support shape looks like around the mark.',
      },
    ],
  },
  {
    focus:
      'Lift defensive pressure with safe tackling habits, ball-carrier protection, and a clear understanding of delay, pressure, and cover.',
    progressionNotes: [
      'Keep tackling volume controlled and coach technique carefully.',
      'Add live decision-making where defenders must choose when to close, contain, or cover.',
      'Build repeated defensive efforts so players can pressure, recover, and pressure again.',
    ],
    runPlan: [
      {
        title: 'Reaction tag and close space',
        durationMinutes: 10,
        description:
          'Quick reaction game where defenders race to close space on a moving attacker without diving or overrunning.',
        coachingPoints:
          'Shorten steps, stay square, and focus on controlling space before winning the ball.',
      },
      {
        title: 'Prep-to-Play tackler and ball carrier',
        durationMinutes: 10,
        description:
          'Coach both the tackler and ball carrier so contact confidence is built around safety, duty of care, and technique.',
        coachingPoints:
          'Track hips, wrap safely, protect the head, and teach the ball carrier to stay strong and brace for contact.',
        media: [
          {
            type: 'video',
            url: 'https://play.afl/video/prep-play-tackler',
            caption: 'Official Prep-to-Play tackling technique reference.',
          },
          {
            type: 'video',
            url: 'https://play.afl/video/prep-play-ball-carrier',
            caption: 'Official Prep-to-Play ball-carrier technique reference.',
          },
        ],
      },
      {
        title: '1v1 tackle to release',
        durationMinutes: 15,
        description:
          'Controlled tackle lane where one player pressures and tackles safely while the next teammate covers the outlet.',
        coachingPoints:
          'Win the feet first, wrap with control, then reset quickly into team defence.',
      },
      {
        title: 'Delay, pressure, cover grid',
        durationMinutes: 15,
        description:
          'Three-defender grid teaching who closes the ball, who protects the next option, and who balances behind.',
        coachingPoints:
          'Closest player delays and pressures, next player covers, third defender provides balance and communication.',
      },
      {
        title: 'Turnover pressure game',
        durationMinutes: 15,
        description:
          'Score only from a forced turnover, rewarding second effort, quick resets, and team pressure language.',
        coachingPoints:
          'Celebrate effort acts, not just possessions won; hunt in pairs and recover to shape after every contest.',
      },
    ],
  },
  {
    focus:
      'Build simple positional understanding so players know where to stand, where to support, and how to stay connected in attack and defence.',
    progressionNotes: [
      'Use clear zones and landmarks so players can picture their role.',
      'Let players solve spacing problems in small games instead of over-instructing every movement.',
      'Challenge them to hold shape under fatigue and communicate the role of teammates around them.',
    ],
    runPlan: [
      {
        title: 'Find your lane',
        durationMinutes: 10,
        description:
          'Players explore wing, corridor, and pocket lanes in a simple movement game with no pressure.',
        coachingPoints:
          'Know your starting spot, scan the whole ground, and move to create width and depth for teammates.',
      },
      {
        title: 'Prep-to-Play warm-up with lane calls',
        durationMinutes: 10,
        description:
          'Warm-up sequence where players finish each movement by calling and sprinting into a lane or support spot.',
        coachingPoints:
          'Move sharply into space, call early, and understand why that lane helps the next player.',
        media: [
          {
            type: 'video',
            url: 'https://play.afl/video/prep-play-dynamic-warm',
            caption: 'Use the warm-up block, then add lane and support calls.',
          },
        ],
      },
      {
        title: 'Keepings Off using 3 teams',
        durationMinutes: 15,
        description:
          'Possession game that rewards staying wide, supporting behind the ball, and recognising the best outlet.',
        coachingPoints:
          'If you are not the receiver, create the next option; width and angles matter more than crowding the ball.',
      },
      {
        title: 'Loose player decision-making',
        durationMinutes: 15,
        description:
          'Players learn how to exploit or avoid the spare player depending on whether they have the ball or are defending.',
        coachingPoints:
          'Attackers identify the free option; defenders cover dangerous space first before chasing the ball.',
      },
      {
        title: 'Zone football with role swaps',
        durationMinutes: 15,
        description:
          'Small-sided role game where players rotate through behind-ball, midfield, and forward responsibilities.',
        coachingPoints:
          'Everyone should understand a basic attacking and defending job, not just the position they start in.',
      },
    ],
  },
  {
    focus:
      'Connect contest to transition so players can win the ball, support quickly, and move from defence to attack with simple decisions.',
    progressionNotes: [
      'Begin with obvious overloads and clear first options.',
      'Reduce time and space so the first support option must appear faster.',
      'Demand repeat transition efforts and better talk under game-like fatigue.',
    ],
    runPlan: [
      {
        title: 'Cross the River to open grass',
        durationMinutes: 10,
        description:
          'Pre-game race to move the ball from congestion into open space with fast handball-and-run support.',
        coachingPoints:
          'Win a side, support underneath, and turn a contest win into quick metres gained.',
      },
      {
        title: 'Prep-to-Play dynamic warm-up and decel',
        durationMinutes: 10,
        description:
          'Movement prep focused on acceleration, deceleration, and directional changes needed for transition running.',
        coachingPoints:
          'First steps matter; accelerate hard, then own your stop and turn to support again.',
        media: [
          {
            type: 'video',
            url: 'https://play.afl/video/prep-play-dynamic-warm',
            caption: 'Use the dynamic warm-up before transition-based drills.',
          },
        ],
      },
      {
        title: 'Rotations - Escape and use the loose player',
        durationMinutes: 15,
        description:
          'Contest starts in traffic and the attacking side must recognise and use the spare player quickly.',
        coachingPoints:
          'First look after winning the ball is to support outside; spread early and trust the easy release.',
      },
      {
        title: 'Coast to coast',
        durationMinutes: 15,
        description:
          'Team transitions the ball from defence into attack with rewarded switch options and aggressive support running.',
        coachingPoints:
          'Players off the ball create the transition, not just the kicker. Sprint to get ahead of the play.',
      },
      {
        title: '30 second goal game',
        durationMinutes: 15,
        description:
          'Timed game that forces quick decision-making from contest to inside-50 entry and finish.',
        coachingPoints:
          'Move the ball with intent, but don’t lose shape; fast does not mean rushed or blind.',
      },
    ],
  },
  {
    focus:
      'Blend fitness into footy by using repeat-effort games that still teach decision-making, support, and defensive pressure.',
    progressionNotes: [
      'Start with short work periods and plenty of coaching pauses.',
      'Stretch effort windows and reduce rest so players learn to execute skills when breathing hard.',
      'Finish with competitive blocks where fitness and game sense both decide the outcome.',
    ],
    runPlan: [
      {
        title: 'Small-grid chase game',
        durationMinutes: 10,
        description:
          'Continuous moving tag game that gets the group sweating quickly while keeping footy fun and competitive.',
        coachingPoints:
          'Work hard for short bursts, recover with purpose, and stay switched on between efforts.',
      },
      {
        title: 'Prep-to-Play strength and movement circuit',
        durationMinutes: 10,
        description:
          'Strength block integrated into training to build body control, robustness, and better movement quality under fatigue.',
        coachingPoints:
          'Quality first: stable landings, controlled trunk, and strong posture through every repetition.',
        media: [
          {
            type: 'video',
            url: 'https://play.afl/video/prep-play-strength-exercises',
            caption: 'Official Prep-to-Play strength reference for football conditioning.',
          },
        ],
      },
      {
        title: 'Awareness football',
        durationMinutes: 15,
        description:
          'Continuous game where players must scan for teammates and opponents while transitioning repeatedly.',
        coachingPoints:
          'Lift eyes before each possession, keep supporting after disposal, and communicate while tired.',
      },
      {
        title: 'Endzone possession repeat efforts',
        durationMinutes: 15,
        description:
          'Teams score through repeated chains into the endzone, rewarding work rate and support runs.',
        coachingPoints:
          'Fitness is shown by how quickly you recover into the next role, not by how hard you sprint once.',
      },
      {
        title: 'Pressure scoreboard game',
        durationMinutes: 15,
        description:
          'Short-burst game with a live scoreboard, rewarding turnovers forced, fast support, and composed finishing.',
        coachingPoints:
          'Players stay calm under fatigue, defend immediately after error, and communicate through every transition.',
      },
    ],
  },
];

function buildTrainingDrill(
  sessionId: string,
  index: number,
  drill: TrainingTemplate['runPlan'][number]
): TrainingSessionDrill {
  return {
    id: `${sessionId}-suggested-drill-${index + 1}`,
    title: drill.title,
    durationMinutes: drill.durationMinutes,
    description: drill.description,
    coachingPoints: drill.coachingPoints,
    media: (drill.media ?? []).map((item, mediaIndex) => {
      return {
        id: `${sessionId}-suggested-drill-${index + 1}-media-${mediaIndex + 1}`,
        type: item.type,
        url: item.url,
        caption: item.caption,
      };
    }),
  };
}

function getSuggestedStructureIndex(session: TrainingSession, sessions: TrainingSession[]) {
  const orderedSessions = [...sessions].sort((left, right) => {
    return (
      new Date(left.date).getTime() - new Date(right.date).getTime() ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id)
    );
  });

  return Math.max(
    0,
    orderedSessions.findIndex((current) => {
      return current.id === session.id;
    })
  );
}

export function resolveTrainingSessionStructure(
  session: TrainingSession,
  sessions: TrainingSession[]
): SuggestedSessionStructure {
  if (session.focus || session.runPlan.length > 0) {
    return {
      focus: session.focus ?? 'No session focus has been added yet.',
      isSuggested: false,
      runPlan: session.runPlan,
    };
  }

  const sessionIndex = getSuggestedStructureIndex(session, sessions);
  const template = TRAINING_TEMPLATE_LIBRARY[sessionIndex % TRAINING_TEMPLATE_LIBRARY.length];
  const progressionTier = Math.min(
    template.progressionNotes.length - 1,
    Math.floor(sessionIndex / TRAINING_TEMPLATE_LIBRARY.length)
  );

  return {
    focus: `${template.focus} ${template.progressionNotes[progressionTier]}`,
    isSuggested: true,
    runPlan: template.runPlan.map((drill, index) => {
      return buildTrainingDrill(session.id, index, drill);
    }),
  };
}
