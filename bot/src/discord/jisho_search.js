const { NavigationChapter, Navigation } = require('monochrome-bot');
const jishoWordSearch = require('../common/jisho_word_search.js');
const JishoDiscordContentFormatter = require('./jisho_discord_content_formatter.js');
const createExampleSearchPages = require('./create_example_search_pages.js');
const addPaginationFooter = require('./add_pagination_footer.js');
const createKanjiSearchDataSource = require('./create_kanji_search_data_source.js');
const createStrokeOrderSearchNavigationChapter = require('./create_stroke_order_search_navigation_chapter.js');

const STROKE_ORDER_EMOTE = '🇸';
const KANJI_EMOTE = '🇰';
const EXAMPLES_EMOTE = '🇪';
const JISHO_EMOTE = '🇯';

class NavigationChapterInformation {
  constructor(navigationChapter, hasAnyPages) {
    this.navigationChapter = navigationChapter;
    this.hasAnyPages = hasAnyPages;
  }
}

class ExamplesSource {
  constructor(authorName, word) {
    this.word = word;
    this.authorName = authorName;
  }

  async prepareData() {
    return addPaginationFooter(await createExampleSearchPages(this.word), this.authorName);
  }

  // eslint-disable-next-line class-methods-use-this
  getPageFromPreparedData(pages, pageIndex) {
    return pages[pageIndex];
  }
}

function createNavigationChapterForKanji(authorName, word, prefix) {
  const dataSource = createKanjiSearchDataSource(
    word,
    authorName,
    prefix,
    true,
  );

  return new NavigationChapter(dataSource);
}

function createNavigationChapterInformationForStrokeOrder(authorName, word) {
  const navigationChapterInfo = createStrokeOrderSearchNavigationChapter(
    word,
    authorName,
    true,
  );

  const { navigationChapter, hasKanjiResults } = navigationChapterInfo;
  return new NavigationChapterInformation(navigationChapter, hasKanjiResults);
}

function createNavigationChapterInformationForExamples(authorName, word) {
  const examplesSource = new ExamplesSource(authorName, word);
  const navigationChapter = new NavigationChapter(examplesSource);

  return navigationChapter;
}

function createNavigationForJishoResults(
  msg,
  authorName,
  authorId,
  crossPlatformResponseData,
) {
  const chapterForEmojiName = {};

  /* Create the Jisho (J) chapter */

  const word = crossPlatformResponseData.searchPhrase;
  const discordContents = JishoDiscordContentFormatter.formatJishoDataBig(
    crossPlatformResponseData,
    true,
    true,
    authorName,
  );

  const jishoNavigationChapter = NavigationChapter.fromContent(discordContents);
  chapterForEmojiName[JISHO_EMOTE] = jishoNavigationChapter;

  /* Create the Kanji (K) chapter */

  const kanjiNavigationChapter = createNavigationChapterForKanji(
    authorName,
    word,
    msg.prefix,
  );

  chapterForEmojiName[KANJI_EMOTE] = kanjiNavigationChapter;

  /* Create the stroke order (S) chapter */

  const strokeOrderNavigationChapterInformation = createNavigationChapterInformationForStrokeOrder(
    authorName,
    word,
    false,
  );

  if (strokeOrderNavigationChapterInformation.hasAnyPages) {
    chapterForEmojiName[STROKE_ORDER_EMOTE] = strokeOrderNavigationChapterInformation
      .navigationChapter;
  }

  /* Create the examples (E) chapter */

  const examplesNavigationChapter = createNavigationChapterInformationForExamples(
    authorName,
    word,
  );

  chapterForEmojiName[EXAMPLES_EMOTE] = examplesNavigationChapter;

  /* Create the navigation. */

  return new Navigation(authorId, true, JISHO_EMOTE, chapterForEmojiName);
}

async function createOnePageBigResultForWord(word) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  const discordContents = JishoDiscordContentFormatter.formatJishoDataBig(
    crossPlatformResponseData,
    false,
  );

  const response = discordContents[0];
  return response;
}

async function createNavigationForWord(authorName, authorId, word, msg) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  return createNavigationForJishoResults(
    msg,
    authorName,
    authorId,
    crossPlatformResponseData,
  );
}

async function createSmallResultForWord(word) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  const discordContent = JishoDiscordContentFormatter.formatJishoDataSmall(
    crossPlatformResponseData,
  );

  return discordContent;
}

module.exports = {
  createNavigationForWord,
  createNavigationForJishoResults,
  createSmallResultForWord,
  createOnePageBigResultForWord,
};
