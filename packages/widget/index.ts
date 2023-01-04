import { Logger } from '@pjblog/logger';
import { Provider, Consumer, LifeError } from '@pjblog/manager';
import { TypeORM } from '@pjblog/typeorm';
import { Http } from '@pjblog/http';
import { Plugin } from '@pjblog/core';
import { Markdown } from '@pjblog/markdown';
import { BlogCommentEntity } from './entity';
import { AddCommentController, PreviewController, DelCommentController, GetCommentsController, GetLatestCommentsController } from './controllers';
import { delCommentsWhenDelArticle, pushCommentTotal } from './hooks';
import { Article } from '@pjblog/core';
import { IConfigs } from './utils';

export * from './controllers';
export * from './dbo';
export * from './entity';
export * from './hooks';
export * from './types';
export * from './utils';

@Provider
export default class Comment extends Plugin<IConfigs> {
  @Consumer(Logger) private readonly Logger: Logger;
  @Consumer(TypeORM) private readonly TypeORM: TypeORM;
  @Consumer(Http) private readonly Http: Http;
  @Consumer(Markdown) private readonly Markdown: Markdown;
  @Consumer(Article) private readonly Article: Article;

  get logger() {
    return this.Logger.value;
  }

  get http() {
    return this.Http;
  }

  get connection() {
    return this.TypeORM.value;
  }

  get markdown() {
    return this.Markdown;
  }

  get article() {
    return this.Article;
  }

  /**
   * 新安装插件时候的生命周期
   * 一般会将数据表描述卸乳
   */
  public async install(): Promise<void> {}

  /**
   * 卸载插件时候专有生命周期
   */
  public async uninstall(): Promise<void> {}

  public onerror(e: LifeError): void {
    this.logger.error(e.stack)
  }

  /**
   * 服务器启动时候逻辑处理
   * @returns 
   */
  public async initialize(): Promise<void | (() => Promise<void>)> {
    await this.TypeORM.synchronize(BlogCommentEntity);
    const unBindDelCommentsWhenDelArticle = delCommentsWhenDelArticle(this);
    const unBindPushCommentTotal = pushCommentTotal();
    this.http.addController(AddCommentController);
    this.http.addController(PreviewController);
    this.http.addController(DelCommentController);
    this.http.addController(GetCommentsController);
    this.http.addController(GetLatestCommentsController);
    this.logger.info('pjblog-plugin-comment Initialized.');
    return async () => {
      this.http.delController(GetLatestCommentsController);
      this.http.delController(GetCommentsController);
      this.http.delController(DelCommentController);
      this.http.delController(PreviewController);
      this.http.delController(AddCommentController);
      unBindPushCommentTotal();
      unBindDelCommentsWhenDelArticle();
      this.logger.info('pjblog-plugin-comment Terminated.');
    }
  }
}