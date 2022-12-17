import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity({ name: 'blog_comments' })
export class BlogCommentEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({
    type: 'text',
    comment: '原始内容'
  })
  public comm_content: string;

  @Column({
    type: 'text',
    comment: 'html内容'
  })
  public comm_html: string;

  @Column({
    type: 'integer',
    default: 0,
    comment: '文章id'
  })
  public comm_article_id: number;

  @Column({
    type: 'integer',
    default: 0,
    comment: '发布者id'
  })
  public comm_user_id: number;

  @Column({
    type: 'integer',
    default: 0,
    comment: '基于上一条评论的内容'
  })
  public comm_parent_id: number;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'IP地址'
  })
  public comm_ip: string;

  @Column({
    type: 'timestamp',
    comment: '创建时间'
  })
  public gmt_create: Date;
}