import {
  DecorationRangeBehavior,
  OverviewRulerLane,
  TextEditor,
  TextEditorDecorationType,
  window,
} from 'vscode';
import {
  BookmarkColor,
  BookmarkDecorationKey,
  BookmarkMeta,
  StringIndexType,
} from '../types';
import {IDisposable, translate} from '../utils';
import resolveServiceManager, {ServiceManager} from './ServiceManager';
import {resolveBookmarkController} from '../bootstrap';
import BookmarksController from '../controllers/BookmarksController';
import logger from '../utils/logger';

/**
 * 装饰器服务类
 */
export default class DecorationService implements IDisposable {
  decorations: Record<BookmarkDecorationKey, TextEditorDecorationType> = {};

  tagDecorations: Record<BookmarkDecorationKey, TextEditorDecorationType> = {};

  private _serviceManager: ServiceManager;
  constructor(sm: ServiceManager) {
    this._serviceManager = sm;
    this._init();
  }

  private _init() {
    this.restoreDecorations();
    if (!this._serviceManager) {
      this._serviceManager = resolveServiceManager();
    }
    this._serviceManager.configService.onDidChangeConfiguration(() => {
      this.restoreDecorations();
      this.updateActiveEditorAllDecorations();
    });
  }

  restoreDecorations() {
    this.disposeAllDiscorations();
    this.decorations = {};
    this.tagDecorations = {};
    const configService = this._serviceManager.configService;
    const colors = configService.colors;

    Object.keys(colors).forEach(item => {
      this.decorations[item] = this.createDecoration(item);
      this.tagDecorations[item] = this.createDecoration(item, true);
    });
  }

  /**
   * 创建文本装饰器
   * @param colorLabel
   * @param options
   * @param hasTag
   * @returns
   */
  createDecoration(colorLabel: string, hasTag: boolean = false) {
    const colors = this._serviceManager.configService.colors;
    const gutters = this._serviceManager.gutterService.gutters;
    const tagGutters = this._serviceManager.gutterService.tagGutters;
    let color = colors[colorLabel] || colors['default'];
    let gutterIconPath = (gutters[colorLabel] || gutters['default']).iconPath;
    let tagGutterIconPath = (tagGutters[colorLabel] || tagGutters['default'])
      .iconPath;

    // 用户配置
    const {
      fontWeight,
      showTextDecoration,
      showGutterIcon,
      showGutterInOverviewRuler,
      alwaysUseDefaultColor,
      wholeLine,
      textDecorationLine,
      textDecorationStyle,
      textDecorationThickness,
      highlightBackground,
      showBorder,
      border,
      showOutline,
      outline,
    } = this._serviceManager.configService.decorationConfiguration;

    let overviewRulerColor;
    let overviewRulerLane: OverviewRulerLane | undefined = undefined;

    if (showGutterInOverviewRuler) {
      overviewRulerColor = color;
      overviewRulerLane = OverviewRulerLane.Center;
    } else {
      overviewRulerColor = undefined;
    }
    let _showGutterIcon = showGutterIcon;

    if (!(showGutterIcon || showGutterInOverviewRuler || showTextDecoration)) {
      window.showInformationMessage(
        translate(
          `'showGutterIcon', 'showGutterInOverviewRuler', 'showTextDecoration' not available at the same time this is only 'false'`,
        ),
      );
      _showGutterIcon = true;
    }

    if (alwaysUseDefaultColor) {
      color = colors.default;
    }

    const decorationGutterIconPath = _showGutterIcon
      ? hasTag
        ? tagGutterIconPath
        : gutterIconPath
      : undefined;

    const decoration = window.createTextEditorDecorationType({
      isWholeLine: wholeLine,
      borderRadius: '2px',
      borderColor: color,
      outlineColor: color,
      fontWeight,
      overviewRulerLane,
      overviewRulerColor,
      rangeBehavior: DecorationRangeBehavior.ClosedClosed,
      gutterIconPath: decorationGutterIconPath,
      gutterIconSize: 'auto',
      border: showBorder ? border : '',
      outline: showOutline ? outline : '',
      backgroundColor: highlightBackground ? color : '',
      textDecoration: showTextDecoration
        ? this.buildTextDecoration({
            color,
            textDecorationLine,
            textDecorationStyle,
            textDecorationThickness,
          })
        : '',
    });

    return decoration;
  }

  /**
   * 构建文本装饰器样式
   * @param decorationOptions
   * @returns
   */
  buildTextDecoration(decorationOptions: {
    textDecorationLine: string;
    textDecorationStyle: string;
    textDecorationThickness: string;
    color: string;
  }) {
    const {
      textDecorationLine,
      textDecorationStyle,
      textDecorationThickness,
      color,
    } = decorationOptions;
    return `${textDecorationLine} ${textDecorationStyle} ${textDecorationThickness} ${color}`;
  }

  /**
   * 创建`rangeOrOptions`
   * @param bookmarks
   * @returns
   */
  createRangeOrOptions(bookmarks: BookmarkMeta[]) {
    return bookmarks.map(bookmark => bookmark.rangesOrOptions);
  }

  /**
   * 更新指定的 editor 中的文本装饰器
   * @param editor
   * @param options
   */
  updateDecoration(
    editor: TextEditor,
    options: {
      color: BookmarkColor;
      bookmarks: BookmarkMeta[];
    },
  ) {
    try {
      const hasLabelBookmarks = options.bookmarks.filter(it => it.label);
      const noLabelBookmarks = options.bookmarks.filter(it => !it.label);

      const tagRangeOrOptions = this.createRangeOrOptions(hasLabelBookmarks);

      editor?.setDecorations(
        this.tagDecorations[options.color] || this.tagDecorations['default'],
        tagRangeOrOptions,
      );
      const noTagRangeOrOptions = this.createRangeOrOptions(noLabelBookmarks);

      editor?.setDecorations(
        this.decorations[options.color] || this.decorations['default'],
        noTagRangeOrOptions,
      );
    } catch (error) {
      // @ts-ignore
      logger.error(error);
    }
  }

  /**
   * 更新给定的编辑器中的`decorations`
   * @param editor {TextEditor}
   * @returns
   */
  updateDecorationsByEditor(editor: TextEditor, clear: boolean = false) {
    if (!editor) {
      return;
    }
    const controller = resolveBookmarkController() as BookmarksController;
    if (!controller) {
      return;
    }
    const bookmarks = controller.getBookmarkStoreByFileUri(editor.document.uri);
    const colors = new Set<string>();

    [
      ...bookmarks.map(it => it.color),
      ...Object.keys(this._serviceManager.configService.colors),
    ].forEach(it => colors.add(it));

    const decorationsGroupByLevel: StringIndexType<any[]> = {};

    colors.forEach(color => {
      if (!decorationsGroupByLevel[color]) {
        decorationsGroupByLevel[color] = [] as any;
      }
      decorationsGroupByLevel[color].push(
        ...bookmarks.filter(it => it.color == color),
      );
    });

    Object.keys(decorationsGroupByLevel).forEach(it => {
      this.updateDecoration(editor, {
        color: it as BookmarkColor,
        bookmarks: clear ? [] : decorationsGroupByLevel[it],
      });
    });
  }

  /**
   * 更新激活的编辑器的所有的`Decorations`
   * @param clear 是否要清除`bookmarks`
   * @returns
   */
  updateActiveEditorAllDecorations(clear: boolean = false) {
    const editors = window.visibleTextEditors;
    if (!editors.length) {
      return;
    }
    for (const editor of editors) {
      this.updateDecorationsByEditor(editor, clear);
    }
  }

  /**
   * dispose 所有的装饰器
   */
  disposeAllDiscorations() {
    for (let decoration of [
      ...Object.values(this.decorations),
      ...Object.values(this.tagDecorations),
    ]) {
      decoration?.dispose();
    }
  }

  dispose(): void {
    this.disposeAllDiscorations();
  }
}