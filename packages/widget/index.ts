import { Logger } from '@pjblog/logger';
import { Provider, Consumer, LifeError, Meta } from '@pjblog/manager';
import { TypeORM } from '@pjblog/typeorm';
import { Http, getWaterFall } from '@pjblog/http';
import { Plugin } from '@pjblog/core';
import { Markdown } from '@pjblog/markdown';
import { BlogCommentEntity } from './entity';
import { AddComment, Preview, DelComment, GetComments, GetLatestComments } from './controllers';
import { delCommentsWhenDelArticle, pushCommentTotal } from './hooks';
import { Article } from '@pjblog/core';
import { IConfigs } from './utils';

@Provider
export default class Comment extends Plugin<IConfigs> {
  @Consumer(Logger) private readonly Logger: Logger;
  @Consumer(TypeORM) private readonly TypeORM: TypeORM;
  @Consumer(Http) private readonly Http: Http;
  @Consumer(Markdown) private readonly Markdown: Markdown;
  @Consumer(Article) private readonly Article: Article;

  constructor(meta: Meta) {
    super(meta);
    /**
     * 在重启时候自动注入数据库描述
     */
    TypeORM.entities.add(BlogCommentEntity)
  }

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
  public async install(): Promise<void> {
    await this.TypeORM.synchronize(BlogCommentEntity);
    this.logger.info('pjblog-plugin-comment Installed.');
  }

  /**
   * 卸载插件时候专有生命周期
   */
  public async uninstall(): Promise<void> {
    this.logger.info('pjblog-plugin-comment UnInstalled.');
  }

  public onerror(e: LifeError): void {
    this.logger.error(e.stack)
  }

  /**
   * 服务器启动时候逻辑处理
   * @returns 
   */
  public async initialize(): Promise<void | (() => Promise<void>)> {
    const unBindDelCommentsWhenDelArticle = delCommentsWhenDelArticle(this);
    const unBindPushCommentTotal = pushCommentTotal();
    this.http.addController(this, AddComment);
    this.http.addController(this, Preview);
    this.http.addController(this, DelComment);
    this.http.addController(this, GetComments);
    this.http.addController(this, GetLatestComments);
    this.logger.info('pjblog-plugin-comment Initialized.');
    return async () => {
      this.http.delController(GetLatestComments);
      this.http.delController(GetComments);
      this.http.delController(DelComment);
      this.http.delController(Preview);
      this.http.delController(AddComment);
      unBindPushCommentTotal();
      unBindDelCommentsWhenDelArticle();
      this.logger.info('pjblog-plugin-comment Terminated.');
    }
  }
}