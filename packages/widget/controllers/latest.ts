import Comment from '..';
import { Controller } from '../utils';
import { Component, Water, Request } from '@pjblog/http';
import { HttpBadRequestException } from '@typeservice/exception';
import { CommentDBO } from '../dbo';
import { getNode } from '@pjblog/manager';
import { TypeORM } from '@pjblog/typeorm';
import type { TCommentRawState } from '../types';
import type { EntityManager } from 'typeorm';

export interface IComment {
  id: number,
  code: string,
  content: string,
  user: {
    nickname: string,
    avatar: string,
  }
}

@Controller('GET', '/latest')
export class GetLatestCommentsController extends Component<IComment[]> {
  public readonly manager: EntityManager;
  public readonly service: CommentDBO;
  public readonly comment: Comment;
  constructor(req: Request) {
    super(req, []);
    this.manager = getNode(TypeORM).value.manager;
    this.service = new CommentDBO(this.manager);
    this.comment = getNode(Comment);
  }

  @Water(1)
  public checkCommentable() {
    const commentbale = this.comment.storage.get('commentable');
    if (!commentbale) {
      throw new HttpBadRequestException('评论功能已禁止');
    }
  }

  @Water(2)
  public runner() {
    const runner = this.service.createNewRunner();
    runner.addSelect('comm.comm_content', 'content')
    runner.orderBy({ 'comm.gmt_create': 'DESC' });
    return runner;
  }

  @Water(3)
  public async list() {
    const runner = this.getCache<GetLatestCommentsController, 'runner'>('runner');
    runner.limit(this.comment.storage.get('latestPagesize'));
    const res = await runner.getRawMany<TCommentRawState & { content: string }>();
    this.res.push(...res.map(chunk => {
      return {
        id: chunk.id,
        code: chunk.code,
        content: chunk.content,
        time: chunk.ctime,
        user: {
          nickname: chunk.nickname,
          avatar: chunk.avatar,
        }
      }
    }))
  }
}