import {Event, Disposable} from 'vscode';
import {BaseMeta, BookmarkStoreRootType} from '../types';
import {UniversalStoreType} from './UniversalBookmarkController';

/**
 * 视图查看方式
 */
export type ViewType = 'tree' | 'list';

/**
 * 视图排序方式
 */
export type SortType = 'name' | 'time';

export type TreeGroupView = 'file' | 'color' | 'default';

export default interface IController extends Disposable {
  get datasource(): BookmarkStoreRootType | UniversalStoreType | undefined;

  get totalCount(): number;

  get labeledCount(): number;

  get viewType(): ViewType;

  get groupView(): TreeGroupView;

  onDidChangeEvent: Event<void>;

  save(): void;
  remove(id: string): void;

  update(id: string, dto: Partial<Omit<BaseMeta, 'id'>>): void;

  restore(): void;

  clearAll(): void;

  refresh(): void;
  changeViewType(viewType: ViewType): void;

  changeSortType(sortType: SortType): void;
}
