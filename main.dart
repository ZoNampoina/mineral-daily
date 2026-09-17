import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.instance.initialize();
  runApp(const MineralDailyApp());
}

class MineralDailyApp extends StatefulWidget {
  const MineralDailyApp({super.key});

  @override
  State<MineralDailyApp> createState() => _MineralDailyAppState();
}

class _MineralDailyAppState extends State<MineralDailyApp> {
  ThemeMode _themeMode = ThemeMode.system;

  void setDark(bool value) {
    setState(() => _themeMode = value ? ThemeMode.dark : ThemeMode.light);
  }

  @override
  Widget build(BuildContext context) {
    final seed = const Color(0xFFB98A2E);
    return MaterialApp(
      title: 'Mineral Daily',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: seed, brightness: Brightness.light),
        useMaterial3: true,
        cardTheme: const CardThemeData(margin: EdgeInsets.zero),
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: seed, brightness: Brightness.dark),
        useMaterial3: true,
        cardTheme: const CardThemeData(margin: EdgeInsets.zero),
      ),
      home: HomeShell(onThemeChanged: setDark),
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.onThemeChanged});
  final ValueChanged<bool> onThemeChanged;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  late final LearningStore store;

  final pages = const [
    TodayScreen(),
    HistoryScreen(),
    QuizScreen(),
    ProgressScreen(),
    SettingsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    store = LearningStore.instance;
    store.load();
  }

  @override
  Widget build(BuildContext context) {
    return LearningScope(
      store: store,
      child: Scaffold(
        body: IndexedStack(index: index, children: pages),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (v) => setState(() => index = v),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.today_outlined), selectedIcon: Icon(Icons.today), label: 'Aujourd’hui'),
            NavigationDestination(icon: Icon(Icons.history), label: 'Historique'),
            NavigationDestination(icon: Icon(Icons.quiz_outlined), selectedIcon: Icon(Icons.quiz), label: 'Quiz'),
            NavigationDestination(icon: Icon(Icons.auto_graph_outlined), label: 'Progression'),
            NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Réglages'),
          ],
        ),
      ),
    );
  }
}

class LearningScope extends InheritedNotifier<LearningStore> {
  const LearningScope({super.key, required LearningStore store, required super.child})
      : super(notifier: store);

  static LearningStore of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<LearningScope>();
    assert(scope != null, 'LearningScope introuvable');
    return scope!.notifier!;
  }
}

class MineralLesson {
  final String name;
  final String symbol;
  final String subtitle;
  final String classification;
  final String formula;
  final String properties;
  final String genesis;
  final String world;
  final String madagascar;
  final String extraction;
  final String processing;
  final String uses;
  final String economy;
  final String environment;
  final List<String> keyPoints;
  final List<String> vocabulary;
  final String caseStudy;
  final String commonMistake;
  final List<QuizQuestion> quiz;

  const MineralLesson({
    required this.name,
    required this.symbol,
    required this.subtitle,
    required this.classification,
    required this.formula,
    required this.properties,
    required this.genesis,
    required this.world,
    required this.madagascar,
    required this.extraction,
    required this.processing,
    required this.uses,
    required this.economy,
    required this.environment,
    required this.keyPoints,
    required this.vocabulary,
    required this.caseStudy,
    required this.commonMistake,
    required this.quiz,
  });
}

class QuizQuestion {
  final String question;
  final List<String> answers;
  final int correctIndex;
  const QuizQuestion(this.question, this.answers, this.correctIndex);
}

const lessons = <MineralLesson>[
  MineralLesson(
    name: 'Or',
    symbol: 'Au',
    subtitle: 'Métal précieux • Jour 1',
    classification: 'Élément natif, groupe de l’or. Métal très dense, malléable et chimiquement peu réactif.',
    formula: 'Au — numéro atomique 79.',
    properties: 'Couleur jaune métallique, éclat métallique, dureté Mohs 2,5–3, densité proche de 19,3 g/cm³. Très ductile et excellent conducteur.',
    genesis: 'Se rencontre dans des veines hydrothermales, des systèmes orogéniques, des porphyres, des gisements épithermaux et des placers issus de l’érosion.',
    world: 'Les grands districts aurifères comprennent notamment le Witwatersrand en Afrique du Sud, les ceintures archéennes du Canada et d’Australie, ainsi que plusieurs districts d’Asie et d’Amérique.',
    madagascar: 'Madagascar possède de nombreuses occurrences aurifères primaires et alluvionnaires. L’orpaillage artisanal est historiquement présent dans plusieurs régions. Les données de ressources doivent être vérifiées projet par projet.',
    extraction: 'Exploration par cartographie, géochimie, géophysique et forage. Exploitation possible en carrière, mine souterraine ou par traitement de placers.',
    processing: 'Concassage-broyage puis concentration gravimétrique, flottation et/ou cyanuration selon la minéralogie. Les minerais réfractaires nécessitent parfois un prétraitement.',
    uses: 'Bijouterie, investissement, électronique, connectique, applications médicales et industrielles.',
    economy: 'L’or est coté mondialement et joue aussi un rôle de réserve de valeur. Son prix varie selon les taux, le dollar, les risques géopolitiques et la demande d’investissement.',
    environment: 'Les principaux enjeux sont la gestion des résidus, l’usage du cyanure, le mercure dans certaines exploitations artisanales, l’eau, la réhabilitation et la traçabilité.',
    keyPoints: [
      'L’or peut être primaire ou secondaire dans les placers.',
      'Sa très forte densité permet la concentration gravimétrique.',
      'La récupération dépend fortement de la minéralogie du minerai.',
      'Un indice aurifère n’est pas automatiquement une réserve exploitable.'
    ],
    vocabulary: [
      'Placer : accumulation de minéraux lourds transportés et concentrés par l’eau.',
      'Teneur : quantité de métal contenue dans une masse de minerai.',
      'Récupération : proportion du métal effectivement extraite au traitement.',
      'Minerai réfractaire : minerai où l’or est difficilement accessible au procédé classique.'
    ],
    caseStudy: 'Witwatersrand, Afrique du Sud : bassin mondialement célèbre pour ses conglomérats aurifères et son rôle historique majeur dans la production d’or.',
    commonMistake: 'Confondre présence d’or, ressource géologique et réserve économiquement exploitable.',
    quiz: [
      QuizQuestion('Quel est le symbole chimique de l’or ?', ['Ag', 'Au', 'Fe', 'Pt'], 1),
      QuizQuestion('Pourquoi la gravimétrie fonctionne-t-elle bien sur l’or libre ?', ['Sa couleur', 'Sa densité élevée', 'Sa dureté', 'Son magnétisme'], 1),
      QuizQuestion('Un placer est principalement lié à…', ['Une concentration mécanique', 'Une fusion industrielle', 'Un gaz volcanique', 'Une météorite'], 0),
    ],
  ),
  MineralLesson(
    name: 'Nickel',
    symbol: 'Ni',
    subtitle: 'Métal de transition • Jour 2',
    classification: 'Élément métallique. Les minerais économiques sont surtout sulfurés ou latéritiques.',
    formula: 'Ni — numéro atomique 28.',
    properties: 'Métal argenté, ferromagnétique, résistant à la corrosion et à haute température.',
    genesis: 'Gisements sulfurés liés à des magmas mafiques-ultramafiques et gisements latéritiques formés par altération intense de roches ultramafiques en climat tropical.',
    world: 'L’Indonésie, les Philippines, la Russie, le Canada et l’Australie figurent parmi les grandes régions minières du nickel selon les périodes et les catégories de production.',
    madagascar: 'Le projet Ambatovy constitue la référence majeure : minerai latéritique de nickel-cobalt exploité et traité industriellement à Madagascar.',
    extraction: 'Décapage et mine à ciel ouvert pour de nombreuses latérites ; exploitation souterraine ou à ciel ouvert pour certains sulfures.',
    processing: 'Les sulfures sont souvent concentrés par flottation. Les latérites peuvent suivre des voies pyrométallurgiques ou hydrométallurgiques, dont HPAL.',
    uses: 'Aciers inoxydables, superalliages, batteries lithium-ion, revêtements et alliages spéciaux.',
    economy: 'La demande est liée à l’acier inoxydable et, de plus en plus, aux chaînes de batteries. Les qualités de nickel ne sont pas toutes interchangeables.',
    environment: 'Gestion des résidus, consommation énergétique, emprise foncière, eaux de procédé et restauration des zones tropicales sont des enjeux clés.',
    keyPoints: [
      'Deux familles majeures : sulfures et latérites.',
      'Les latérites sont particulièrement importantes sous climat tropical.',
      'Le nickel est essentiel aux aciers inoxydables.',
      'Certaines chimies de batteries utilisent beaucoup de nickel.'
    ],
    vocabulary: [
      'Latérite : profil d’altération tropicale enrichi en certains métaux.',
      'Ultramafique : roche très riche en Mg et Fe, pauvre en silice.',
      'HPAL : lixiviation acide sous haute pression.',
      'Saprolite : horizon altéré conservant en partie la structure de la roche.'
    ],
    caseStudy: 'Ambatovy, Madagascar : chaîne intégrée mine–pipeline–usine de traitement, importante pour l’étude des latérites Ni-Co.',
    commonMistake: 'Traiter tous les minerais de nickel comme s’ils nécessitaient le même procédé métallurgique.',
    quiz: [
      QuizQuestion('Les latérites nickélifères se forment surtout par…', ['Altération intense', 'Cristallisation du sel', 'Métamorphisme de contact', 'Évaporation marine'], 0),
      QuizQuestion('HPAL est surtout une technique de…', ['Forage', 'Hydrométallurgie', 'Géophysique', 'Ventilation'], 1),
      QuizQuestion('À Madagascar, quel projet est emblématique du nickel-cobalt ?', ['Ranobe', 'Ambatovy', 'Ilakaka', 'Andavakoera'], 1),
    ],
  ),
  MineralLesson(
    name: 'Cobalt',
    symbol: 'Co',
    subtitle: 'Métal critique • Jour 3',
    classification: 'Métal de transition, souvent produit comme sous-produit du cuivre ou du nickel.',
    formula: 'Co — numéro atomique 27.',
    properties: 'Métal dur, ferromagnétique, stable à haute température, utilisé dans des alliages et matériaux électrochimiques.',
    genesis: 'Présent dans plusieurs types de gisements : Cu-Co sédimentaires, sulfures Ni-Cu-Co, latérites Ni-Co et quelques systèmes hydrothermaux.',
    world: 'La ceinture cuprifère d’Afrique centrale est un centre majeur de production mondiale de cobalt. D’autres sources existent en Indonésie, Australie, Canada et ailleurs.',
    madagascar: 'À Madagascar, le cobalt est notamment associé au système latéritique exploité par Ambatovy, conjointement avec le nickel.',
    extraction: 'Le cobalt suit souvent le schéma d’extraction du minerai principal, nickel ou cuivre, avant séparation métallurgique.',
    processing: 'Hydrométallurgie fréquente : lixiviation, purification, extraction par solvant, précipitation puis production de produits cobaltés.',
    uses: 'Cathodes de batteries, superalliages, catalyseurs, outils et pigments.',
    economy: 'Marché sensible à la concentration géographique de l’offre, aux technologies de batteries et aux politiques de traçabilité.',
    environment: 'Traçabilité, conditions de production artisanale dans certains pays, gestion des réactifs et résidus sont des enjeux majeurs.',
    keyPoints: [
      'Le cobalt est souvent un sous-produit.',
      'Il est important dans plusieurs chimies de batteries.',
      'La géographie de l’offre influence fortement son importance stratégique.',
      'La traçabilité fait partie des enjeux de chaîne de valeur.'
    ],
    vocabulary: [
      'Sous-produit : substance valorisée en plus du produit principal.',
      'Cathode : électrode où se produit une réduction lors du fonctionnement défini du système.',
      'Extraction par solvant : séparation hydrométallurgique utilisant deux phases liquides.',
      'Traçabilité : capacité à suivre l’origine et le parcours d’un produit.'
    ],
    caseStudy: 'Copperbelt Afrique centrale : district Cu-Co de rang mondial, essentiel pour comprendre le lien entre géologie, métallurgie et géopolitique.',
    commonMistake: 'Analyser le cobalt uniquement comme une mine autonome alors qu’il dépend souvent de l’économie du cuivre ou du nickel.',
    quiz: [
      QuizQuestion('Le cobalt est souvent produit comme…', ['Stérile', 'Sous-produit', 'Combustible', 'Flux'], 1),
      QuizQuestion('Quel secteur tire fortement la demande récente ?', ['Batteries', 'Ciment', 'Bois', 'Verre plat'], 0),
      QuizQuestion('À Ambatovy, le cobalt est associé principalement au…', ['Nickel', 'Fer', 'Or', 'Graphite'], 0),
    ],
  ),
  MineralLesson(
    name: 'Graphite',
    symbol: 'C',
    subtitle: 'Minéral industriel • Jour 4',
    classification: 'Forme cristalline naturelle du carbone, distincte du diamant.',
    formula: 'C.',
    properties: 'Très tendre, noir à gris, bon conducteur électrique, lubrifiant naturel, forte résistance thermique.',
    genesis: 'Peut se former par métamorphisme de matière carbonée, dans des veines ou sous forme disséminée en paillettes.',
    world: 'La Chine domine historiquement une grande partie de la production et du traitement. Des projets importants existent aussi en Afrique, dont Madagascar et le Mozambique.',
    madagascar: 'Madagascar est connu pour ses graphites en paillettes, notamment dans des terrains métamorphiques. Plusieurs projets ont ciblé des produits destinés aux marchés industriels et aux batteries.',
    extraction: 'Mine à ciel ouvert fréquente, concassage et broyage contrôlé pour préserver les paillettes.',
    processing: 'Flottation pour augmenter la teneur en carbone ; purification supplémentaire pour certains usages à haute spécification, notamment les matériaux d’anode.',
    uses: 'Réfractaires, lubrifiants, métallurgie, crayons, conducteurs et anodes de batteries lithium-ion.',
    economy: 'La valeur dépend fortement de la teneur, de la taille des paillettes, de la pureté, de la forme du produit et des spécifications clients.',
    environment: 'Poussières, eau, résidus, énergie de purification et restauration des sites doivent être gérés.',
    keyPoints: [
      'Le graphite est du carbone cristallin.',
      'La taille des paillettes influence la valeur.',
      'La flottation est un procédé courant.',
      'Le graphite naturel peut alimenter la chaîne des anodes de batteries.'
    ],
    vocabulary: [
      'Paillette : cristal lamellaire de graphite.',
      'Carbone graphitique : carbone organisé selon la structure du graphite.',
      'Purification : élimination des impuretés pour atteindre une spécification élevée.',
      'Anode : électrode associée à l’oxydation selon le mode de fonctionnement considéré.'
    ],
    caseStudy: 'Graphites malgaches : exemple utile pour relier géologie métamorphique, qualité des paillettes et débouchés batterie.',
    commonMistake: 'Comparer des prix de graphite sans vérifier la pureté, la granulométrie et la forme commerciale.',
    quiz: [
      QuizQuestion('Le graphite est principalement composé de…', ['Carbone', 'Silicium', 'Fer', 'Calcium'], 0),
      QuizQuestion('Quel procédé est courant pour concentrer le graphite ?', ['Flottation', 'Distillation', 'Calcination du béton', 'Électrolyse de l’eau'], 0),
      QuizQuestion('Quel débouché est stratégique pour le graphite purifié ?', ['Anodes de batteries', 'Carburant diesel', 'Briques ordinaires', 'Papier'], 0),
    ],
  ),
  MineralLesson(
    name: 'Ilménite',
    symbol: 'FeTiO₃',
    subtitle: 'Minerai de titane • Jour 5',
    classification: 'Oxyde de fer et titane, important minerai de titane.',
    formula: 'FeTiO₃.',
    properties: 'Noire, dense, faible à modérément magnétique selon composition et altération, dureté autour de 5–6 Mohs.',
    genesis: 'Présente dans certaines roches magmatiques et concentrée secondairement dans les sables lourds littoraux par tri mécanique.',
    world: 'Les grands producteurs et districts de sables minéralisés se situent notamment en Australie, Afrique australe, Inde et autres littoraux riches en minéraux lourds.',
    madagascar: 'Madagascar possède d’importants sables minéralisés à ilménite sur certains littoraux. Le sud-est est particulièrement connu pour l’exploitation des sables minéraux.',
    extraction: 'Dragage ou exploitation de sables meubles, puis concentration gravimétrique et séparation magnétique/électrostatique.',
    processing: 'Production d’un concentré d’ilménite, éventuellement transformé en scorie titanifère ou matière première pour TiO₂.',
    uses: 'Principalement pigment dioxyde de titane ; aussi matières premières pour titane métal et autres produits.',
    economy: 'La valeur dépend du grade TiO₂, des impuretés, de la logistique et de la demande de pigments.',
    environment: 'Gestion du littoral, biodiversité, eau, réhabilitation progressive des dunes et relation avec les communautés sont centrales.',
    keyPoints: [
      'L’ilménite est un oxyde Fe-Ti.',
      'Les sables lourds peuvent concentrer naturellement l’ilménite.',
      'Le TiO₂ est le principal débouché.',
      'Madagascar possède des occurrences littorales importantes.'
    ],
    vocabulary: [
      'Sables lourds : sables enrichis en minéraux de forte densité.',
      'Séparation magnétique : tri basé sur la réponse des minéraux à un champ magnétique.',
      'TiO₂ : dioxyde de titane, très utilisé comme pigment.',
      'Réhabilitation progressive : remise en état au fur et à mesure de l’avancement minier.'
    ],
    caseStudy: 'Sables minéralisés du sud-est de Madagascar : cas d’étude pertinent pour l’exploitation côtière et la séparation des minéraux lourds.',
    commonMistake: 'Assimiler tout sable noir à une ressource économique sans analyse minéralogique, teneur et continuité.',
    quiz: [
      QuizQuestion('Quelle est la formule de l’ilménite ?', ['FeTiO₃', 'SiO₂', 'Al₂O₃', 'CaCO₃'], 0),
      QuizQuestion('Son principal intérêt économique est lié au…', ['Titane', 'Lithium', 'Uranium', 'Étain'], 0),
      QuizQuestion('Dans les sables lourds, la concentration naturelle résulte surtout du…', ['Tri mécanique', 'Forage', 'Soufflage industriel', 'Gel'], 0),
    ],
  ),
];

class LearningStore extends ChangeNotifier {
  LearningStore._();
  static final instance = LearningStore._();

  SharedPreferences? _prefs;
  final Set<String> favorites = {};
  final Map<String, int> quizScores = {};
  bool notificationsEnabled = true;
  int notificationHour = 7;
  int notificationMinute = 0;

  Future<void> load() async {
    _prefs = await SharedPreferences.getInstance();
    favorites
      ..clear()
      ..addAll(_prefs?.getStringList('favorites') ?? []);
    final raw = _prefs?.getString('scores');
    if (raw != null) {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      quizScores
        ..clear()
        ..addAll(decoded.map((k, v) => MapEntry(k, v as int)));
    }
    notificationsEnabled = _prefs?.getBool('notifications') ?? true;
    notificationHour = _prefs?.getInt('hour') ?? 7;
    notificationMinute = _prefs?.getInt('minute') ?? 0;
    notifyListeners();
    if (notificationsEnabled) {
      await NotificationService.instance.scheduleDaily(notificationHour, notificationMinute);
    }
  }

  bool isFavorite(String name) => favorites.contains(name);

  Future<void> toggleFavorite(String name) async {
    if (!favorites.add(name)) favorites.remove(name);
    await _prefs?.setStringList('favorites', favorites.toList());
    notifyListeners();
  }

  Future<void> saveScore(String name, int score) async {
    final current = quizScores[name] ?? 0;
    if (score > current) quizScores[name] = score;
    await _prefs?.setString('scores', jsonEncode(quizScores));
    notifyListeners();
  }

  Future<void> setNotification(bool value) async {
    notificationsEnabled = value;
    await _prefs?.setBool('notifications', value);
    if (value) {
      await NotificationService.instance.scheduleDaily(notificationHour, notificationMinute);
    } else {
      await NotificationService.instance.cancelDaily();
    }
    notifyListeners();
  }

  Future<void> setNotificationTime(TimeOfDay value) async {
    notificationHour = value.hour;
    notificationMinute = value.minute;
    await _prefs?.setInt('hour', value.hour);
    await _prefs?.setInt('minute', value.minute);
    if (notificationsEnabled) {
      await NotificationService.instance.scheduleDaily(value.hour, value.minute);
    }
    notifyListeners();
  }

  int get completed => quizScores.values.where((s) => s > 0).length;
  int get totalPoints => quizScores.values.fold(0, (a, b) => a + b);
}

class NotificationService {
  NotificationService._();
  static final instance = NotificationService._();
  final plugin = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    tz.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Indian/Antananarivo'));

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const settings = InitializationSettings(android: android);
    await plugin.initialize(settings: settings);

    final androidPlugin = plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();
    await androidPlugin?.requestExactAlarmsPermission();
  }

  Future<void> scheduleDaily(int hour, int minute) async {
    await plugin.cancel(id: 700);
    final now = tz.TZDateTime.now(tz.local);
    var next = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (!next.isAfter(now)) next = next.add(const Duration(days: 1));

    await plugin.zonedSchedule(
      id: 700,
      title: 'Minéral du jour',
      body: 'Ta nouvelle leçon est prête. Ouvre Mineral Daily pour apprendre quelque chose de nouveau.',
      scheduledDate: next,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'daily_learning',
          'Apprentissage quotidien',
          channelDescription: 'Rappel quotidien du minéral du jour',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  Future<void> cancelDaily() => plugin.cancel(id: 700);
}

MineralLesson lessonForToday() {
  final now = DateTime.now();
  final anchor = DateTime(2026, 9, 17);
  final days = now.difference(anchor).inDays;
  final i = ((days % lessons.length) + lessons.length) % lessons.length;
  return lessons[i];
}

class AppHeader extends StatelessWidget {
  const AppHeader(this.title, {super.key, this.subtitle});
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ],
        ]),
      ),
    );
  }
}

class TodayScreen extends StatelessWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lesson = lessonForToday();
    final store = LearningScope.of(context);
    final date = DateTime.now();
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    final dateText = '${date.day} ${months[date.month-1]} ${date.year}';

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: AppHeader('Mineral Daily', subtitle: 'Chaque jour, une nouvelle connaissance.')),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
            sliver: SliverList.list(children: [
              Card(
                clipBehavior: Clip.antiAlias,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text(dateText.toUpperCase(), style: Theme.of(context).textTheme.labelMedium?.copyWith(letterSpacing: 1.2))),
                      IconButton(
                        tooltip: 'Favori',
                        onPressed: () => store.toggleFavorite(lesson.name),
                        icon: Icon(store.isFavorite(lesson.name) ? Icons.bookmark : Icons.bookmark_border),
                      )
                    ]),
                    const SizedBox(height: 8),
                    Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Expanded(child: Text(lesson.name, style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w900))),
                      Text(lesson.symbol, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700)),
                    ]),
                    const SizedBox(height: 4),
                    Text(lesson.subtitle, style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LessonDetailScreen(lesson: lesson))),
                      icon: const Icon(Icons.menu_book),
                      label: const Text('Commencer la leçon'),
                    )
                  ]),
                ),
              ),
              const SizedBox(height: 18),
              Text('À retenir aujourd’hui', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              ...lesson.keyPoints.map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Padding(padding: EdgeInsets.only(top: 2), child: Icon(Icons.check_circle_outline, size: 20)),
                  const SizedBox(width: 10),
                  Expanded(child: Text(p)),
                ]),
              )),
              const SizedBox(height: 14),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.quiz_outlined),
                  title: const Text('Mini-quiz du jour'),
                  subtitle: Text('${lesson.quiz.length} questions • meilleur score : ${store.quizScores[lesson.name] ?? 0}/${lesson.quiz.length}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => QuizRunner(lesson: lesson))),
                ),
              ),
            ]),
          )
        ],
      ),
    );
  }
}

class LessonDetailScreen extends StatelessWidget {
  const LessonDetailScreen({super.key, required this.lesson});
  final MineralLesson lesson;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${lesson.name} • ${lesson.symbol}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard('Classification', lesson.classification, Icons.category_outlined),
          SectionCard('Composition', lesson.formula, Icons.science_outlined),
          SectionCard('Propriétés', lesson.properties, Icons.diamond_outlined),
          SectionCard('Genèse et gisements', lesson.genesis, Icons.landscape_outlined),
          SectionCard('Grandes zones mondiales', lesson.world, Icons.public),
          SectionCard('Madagascar', lesson.madagascar, Icons.place_outlined),
          SectionCard('Exploration & exploitation', lesson.extraction, Icons.engineering_outlined),
          SectionCard('Traitement / minéralurgie', lesson.processing, Icons.precision_manufacturing_outlined),
          SectionCard('Usages', lesson.uses, Icons.factory_outlined),
          SectionCard('Économie', lesson.economy, Icons.show_chart),
          SectionCard('Environnement & responsabilité', lesson.environment, Icons.eco_outlined),
          const SizedBox(height: 8),
          Text('Vocabulaire', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          ...lesson.vocabulary.map((v) => Card(child: Padding(padding: const EdgeInsets.all(14), child: Text(v)))),
          const SizedBox(height: 18),
          SectionCard('Cas concret', lesson.caseStudy, Icons.travel_explore),
          SectionCard('Erreur fréquente à éviter', lesson.commonMistake, Icons.warning_amber_rounded),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => QuizRunner(lesson: lesson))),
            icon: const Icon(Icons.quiz),
            label: const Text('Faire le quiz'),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard(this.title, this.text, this.icon, {super.key});
  final String title;
  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(text),
            ]))
          ]),
        ),
      ),
    );
  }
}

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = LearningScope.of(context);
    return Scaffold(
      body: Column(children: [
        const AppHeader('Historique', subtitle: 'Retrouve les minéraux déjà disponibles.'),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
            itemCount: lessons.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final l = lessons[i];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(child: Text(l.symbol.length <= 3 ? l.symbol : l.symbol.substring(0, 3))),
                  title: Text(l.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(l.subtitle),
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    if (store.isFavorite(l.name)) const Icon(Icons.bookmark, size: 20),
                    const Icon(Icons.chevron_right),
                  ]),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LessonDetailScreen(lesson: l))),
                ),
              );
            },
          ),
        )
      ]),
    );
  }
}

class QuizScreen extends StatelessWidget {
  const QuizScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = LearningScope.of(context);
    return Scaffold(
      body: Column(children: [
        const AppHeader('Quiz', subtitle: 'Teste ta mémoire et améliore ton meilleur score.'),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
            itemCount: lessons.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final l = lessons[i];
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.psychology_alt_outlined),
                  title: Text(l.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('Meilleur score : ${store.quizScores[l.name] ?? 0}/${l.quiz.length}'),
                  trailing: const Icon(Icons.play_arrow_rounded),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => QuizRunner(lesson: l))),
                ),
              );
            },
          ),
        )
      ]),
    );
  }
}

class QuizRunner extends StatefulWidget {
  const QuizRunner({super.key, required this.lesson});
  final MineralLesson lesson;

  @override
  State<QuizRunner> createState() => _QuizRunnerState();
}

class _QuizRunnerState extends State<QuizRunner> {
  int index = 0;
  int score = 0;
  int? selected;
  bool finished = false;

  void answer(int i) {
    if (selected != null) return;
    setState(() {
      selected = i;
      if (i == widget.lesson.quiz[index].correctIndex) score++;
    });
  }

  void next() {
    if (selected == null) return;
    if (index == widget.lesson.quiz.length - 1) {
      LearningScope.of(context).saveScore(widget.lesson.name, score);
      setState(() => finished = true);
    } else {
      setState(() {
        index++;
        selected = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (finished) {
      return Scaffold(
        appBar: AppBar(title: Text('Quiz • ${widget.lesson.name}')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(score == widget.lesson.quiz.length ? Icons.emoji_events : Icons.school, size: 64),
              const SizedBox(height: 16),
              Text('$score / ${widget.lesson.quiz.length}', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text(score == widget.lesson.quiz.length ? 'Maîtrisé.' : 'Continue la révision.', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 24),
              FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Terminer')),
            ]),
          ),
        ),
      );
    }

    final q = widget.lesson.quiz[index];
    return Scaffold(
      appBar: AppBar(title: Text('Quiz • ${widget.lesson.name}')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          LinearProgressIndicator(value: (index + 1) / widget.lesson.quiz.length),
          const SizedBox(height: 20),
          Text('Question ${index + 1}/${widget.lesson.quiz.length}', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 10),
          Text(q.question, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 20),
          ...List.generate(q.answers.length, (i) {
            final chosen = selected == i;
            final correct = selected != null && i == q.correctIndex;
            final wrong = chosen && i != q.correctIndex;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                  side: BorderSide(
                    color: correct ? Colors.green : wrong ? Colors.red : Theme.of(context).colorScheme.outline,
                    width: correct || wrong ? 2 : 1,
                  ),
                ),
                onPressed: () => answer(i),
                child: Align(alignment: Alignment.centerLeft, child: Text(q.answers[i])),
              ),
            );
          }),
          const Spacer(),
          FilledButton(
            onPressed: selected == null ? null : next,
            child: Text(index == widget.lesson.quiz.length - 1 ? 'Voir le résultat' : 'Question suivante'),
          )
        ]),
      ),
    );
  }
}

class ProgressScreen extends StatelessWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = LearningScope.of(context);
    final possible = lessons.fold<int>(0, (sum, l) => sum + l.quiz.length);
    final ratio = possible == 0 ? 0.0 : store.totalPoints / possible;
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          const AppHeader('Progression', subtitle: 'Une petite avance chaque jour.'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${store.totalPoints} points', style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(value: ratio.clamp(0, 1)),
                  const SizedBox(height: 12),
                  Text('${store.completed}/${lessons.length} quiz commencés • ${store.favorites.length} favoris'),
                ]),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Meilleurs scores', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          ),
          const SizedBox(height: 8),
          ...lessons.map((l) => ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 20),
            title: Text(l.name),
            trailing: Text('${store.quizScores[l.name] ?? 0}/${l.quiz.length}', style: const TextStyle(fontWeight: FontWeight.w800)),
          ))
        ],
      ),
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = LearningScope.of(context);
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          const AppHeader('Réglages', subtitle: 'Configure ton rituel quotidien.'),
          SwitchListTile(
            title: const Text('Rappel quotidien'),
            subtitle: const Text('Notification locale du minéral du jour'),
            value: store.notificationsEnabled,
            onChanged: store.setNotification,
          ),
          ListTile(
            enabled: store.notificationsEnabled,
            leading: const Icon(Icons.schedule),
            title: const Text('Heure du rappel'),
            subtitle: Text('${store.notificationHour.toString().padLeft(2, '0')}:${store.notificationMinute.toString().padLeft(2, '0')}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: !store.notificationsEnabled ? null : () async {
              final chosen = await showTimePicker(
                context: context,
                initialTime: TimeOfDay(hour: store.notificationHour, minute: store.notificationMinute),
              );
              if (chosen != null) await store.setNotificationTime(chosen);
            },
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.language),
            title: Text('Fuseau horaire'),
            subtitle: Text('Indian/Antananarivo • Madagascar'),
          ),
          const ListTile(
            leading: Icon(Icons.cloud_off_outlined),
            title: Text('Mode actuel'),
            subtitle: Text('V1 locale : 5 leçons intégrées. Connexion IA prévue dans la V2.'),
          ),
          const ListTile(
            leading: Icon(Icons.security_outlined),
            title: Text('Sécurité'),
            subtitle: Text('Aucune clé API n’est enregistrée dans cette application.'),
          ),
        ],
      ),
    );
  }
}
