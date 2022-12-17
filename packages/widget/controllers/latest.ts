import { SelectQueryBuilder } from 'typeorm';
import { Controller } from '../utils';
import { Component, Water } from '@pjblog/http';
import { HttpBadRequestException } from '@typeservice/exception';
import { CommentDBO } from '../dbo';
import { BlogCommentEntity } from '../entity';
import type Comment from '..';
import type { TCommentRawState } from '../types';

interface IComment {
  id: number,
  code: string,
  content: string,
  user: {
    nickname: string,
    avatar: string,
  }
}

@Controller('GET', '/latest')
export class GetLatestComments extends Component<Comment, IComment[]> {
  get manager() {
    return this.container.connection.manager;
  }

  public response(): IComment[] {
    return [];
  }

  @Water()
  public checkCommentable() {
    return () => {
      const commentbale = this.container.storage.get('commentable');
      if (!commentbale) {
        throw new HttpBadRequestException('评论功能已禁止');
      }
    }
  }

  @Water({ stage: 2 })
  public runner() {
    const service = new CommentDBO(this.manager);
    return () => {
      const runner = service.createNewRunner();
      runner.addSelect('comm.comm_content', 'content')
      runner.orderBy({ 'comm.gmt_create': 'DESC' });
      return runner;
    }
  }

  @Water({ stage: 3 })
  public list() {
    return async (context: IComment[], runner: SelectQueryBuilder<BlogCommentEntity>) => {
      runner.limit(this.container.storage.get('latestPagesize'));
      const res = await runner.getRawMany<TCommentRawState & { content: string }>();
      context.push(...res.map(chunk => {
        return {
          id: chunk.id,
          code: chunk.code,
          content: chunk.content,
          user: {
            nickname: chunk.nickname,
            avatar: chunk.avatar,
          }
        }
      }))
    }
  }
}