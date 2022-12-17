import { dbo } from '@pjblog/typeorm';
import { getNode } from '@pjblog/manager';
import { Markdown } from '@pjblog/markdown';
import { BlogCommentEntity } from './entity';
import { TCommentRawState, TCommentState } from './types';
import { BlogUserEntity, BlogArticleEntity } from '@pjblog/core';

export class CommentDBO extends dbo {
  get repository() {
    return this.manager.getRepository(BlogCommentEntity);
  }

  public async delete(entity: BlogCommentEntity) {
    const isReply = entity.comm_parent_id !== 0;
    if (isReply) return await this.repository.delete(entity.id);
    const replies = await this.repository.find({
      where: {
        comm_parent_id: entity.id,
      }
    })
    const ids = [entity, ...replies].map(c => c.id);
    if (ids.length) {
      return await this.repository.delete(ids);
    }
  }

  public getOne(id: number) {
    return this.repository.findOne({
      where: {
        id
      }
    })
  }

  public async deleteAllArticleComments(aid: number) {
    const comments = await this.repository.find({
      where: {
        comm_article_id: aid,
      }
    })
    if (comments.length) {
      return await this.repository.delete(comments.map(c => c.id));
    }
  }

  public formatRawComments(raws: TCommentRawState[]): TCommentState[] {
    return raws.map(raw => {
      return {
        id: raw.id,
        html: raw.html,
        ip: raw.ip,
        ctime: raw.ctime,
        rid: raw.rid,
        content: raw.content,
        article: {
          id: raw.aid,
          title: raw.title,
          code: raw.code,
        },
        user: {
          id: raw.uid,
          nickname: raw.nickname,
          account: raw.account,
          avatar: raw.avatar,
          level: raw.level
        }
      }
    })
  }

  public createNewRunner() {
    return this.repository.createQueryBuilder('comm')
      .leftJoin(BlogUserEntity, 'user', 'user.id=comm.comm_user_id')
      .leftJoin(BlogArticleEntity, 'art', 'art.id=comm.comm_article_id')
      .select('comm.id', 'id')
      .addSelect('comm.comm_html', 'html')
      .addSelect('comm.comm_parent_id', 'rid')
      .addSelect('art.article_title', 'title')
      .addSelect('art.id', 'aid')
      .addSelect('art.article_code', 'code')
      .addSelect('user.id', 'uid')
      .addSelect('user.nickname', 'nickname')
      .addSelect('user.avatar', 'avatar')
      .addSelect('user.account', 'account')
      .addSelect('user.level', 'level')
      .addSelect('comm.comm_ip', 'ip')
      .addSelect('comm.gmt_create', 'ctime');
  }
}