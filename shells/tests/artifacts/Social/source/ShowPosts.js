/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({UiParticle, resolver, log, html}) => {
  const host = `social-show-posts`;

  const template = html`
<style>
  [${host}] icon {
    float: right;
    margin-right: 1em;
    visibility: hidden;
  }
  [${host}] [msg]:hover icon {
    visibility: visible;
  }
  [${host}] {
    border-top: 1px solid lightgrey;
    color: rgba(0, 0, 0, 0.87);
    font-family: 'Google Sans', sans-serif;
    font-size: 16pt;
    margin: auto auto;
    max-width: 600px;
  }
  [${host}] [header] {
    background-color: white;
    border-bottom: 1px solid lightgrey;
    text-align: center;
  }
  [${host}] [header] [blogAvatar] {
    display: inline-block;
    height: 56px;
    width: 56px;
    min-width: 56px;
    border-radius: 100%;
    margin-left: auto;
    margin-right: auto;
    margin-top: 16px;
  }
  [${host}] [header] [blogDescription] {
    color: rgba(0, 0, 0, 0.4);
    font-size: 16pt;
    margin-bottom: 14px;
    text-decoration: underline lightgrey;
  }
  [${host}] [zerostate] {
    font-size: 32pt;
    margin: 0.5em 56px auto 56px;
    text-align: center;
  }
  [${host}] [blogDescription] input {
    border: none;
    color: rgba(0, 0, 0, 0.4);
    font-family: 'Google Sans', sans-serif;
    font-size: 16pt;
    text-align: center;
    text-decoration: underline lightgrey;
  }
  [${host}] [blogDescription] input:focus {
    text-decoration: underline #03A9F4;
    color: #03A9F4;
  }
  [${host}] [msg] {
    padding-bottom: 16px;
    border-bottom: solid 0.5px;
    border-bottom-color: #d4d4d4;
  }
  @media(min-width: 600px) {
    [${host}] [msg] {
      border: none;
      box-shadow: 0 0 2px rgba(0,0,0,.15);
      max-width: 480px;
      margin: 0 auto;
      padding: 1px 0 16px 0;
    }
    [${host}] [header] {
      margin-bottom: 16px;
    }
  }
  [${host}] [msg] [title] {
    margin-bottom: 14px;
    margin-top: 16px;
  }
  [${host}] [msg] [content] {
    margin: 0 16px 0 56px;
  }
  [${host}] [msg] [content] img {
    display: block;
  }
  [${host}] [owner] {
    font-size: 14pt;
    margin-right: 6px;
  }
  [${host}] [when] {
    float: left;
  }
  [${host}] [when-month],
  [${host}] [when-day] {
    color: rgba(0, 0, 0, 0.4);
    display: block;
    font-size: 12pt;
    padding-left: 16px;
    width: 40px;
  }
  [${host}] input:focus {
    outline: 0;
  }
</style>
<div ${host}>
  <div header hidden="{{isAggregatedFeed}}">
    <div blogAvatar style='{{blogAvatarStyle}}'></div>
    <div blogAuthor>{{blogAuthor}}</div>
    <div>{{blogDescription}}</div>
  </div>
  <div zeroState hidden="{{hideZeroState}}">
    <!-- TODO(wkorman): Show different zero-state text and maybe a link
         to create a new arc when we're an aggregated feed. -->
    Get started by naming your miniblog and creating your first post!
  </div>
  <div postContent>
    <!-- TODO(wkorman): Convert to standard list particle. -->
    <x-list items="{{posts}}">
        <template>
        <div msg>
          <div title>
            <div when>
              <span when-month>{{month}}</span>
              <span when-day>{{day}}</span>
            </div>
            <icon style%="{{style}}" value="{{id}}" on-click="onDeletePost">delete</icon>
          </div>
          <div content value="{{id}}">
            <img src="{{image}}" width="{{imageWidth}}" height="{{imageHeight}}">
            <span>{{message}}</span>
          </div>
          <div style="clear: both;"></div>
        </div>
        </template>
    </x-list>
  </div>
</div>
<template blog-description-fixed>
  <div blogDescription>{{blogDescription}}</div>
</template>
<template blog-description-editable>
  <div blogDescription><input value="{{blogDescription}}" placeholder="Name your blog" on-blur="onBlurDescription"></div>
</template>`;

  return class extends UiParticle {
    get template() {
      return template;
    }
    peopleSetToMap(people) {
      const peopleMap = {};
      if (people) {
        people.map(p => peopleMap[p.id] = p.name);
      }
      return peopleMap;
    }
    avatarSetToMap(avatars) {
      const avatarMap = {};
      if (avatars) {
        avatars.map(a => avatarMap[a.owner] = a.url);
      }
      return avatarMap;
    }
    initBlogMetadata(props) {
      if (!props.metadata) {
        // Note that the aggregated feed recipe use case for this particle does
        // not provide a metadata handle at all.
        // TODO(wkorman): Consider splitting this particle into separate
        // ones -- one for working with a single miniblog and a separate one
        // to act as the feed, as differing logic is starting to get complex.
        if (this.handles.get('metadata')) {
          this.updateSingleton('metadata', {blogOwner: props.user.id, description: ''});
        }
      }
    }
    willReceiveProps(props) {
      if (props.posts || props.stats) {
        this.initBlogMetadata(props);
        // Filter posts with no time stamp, in case somehow people have for
        // example old game stats that don't have a createdTimestamp written.
        const allPosts = (props.posts || [])
                             .concat(props.stats || [])
                             .filter(p => p.createdTimestamp);
        this.setState({
          posts: allPosts,
          people: this.peopleSetToMap(props.people),
          avatars: this.avatarSetToMap(props.avatars),
        });
      }
    }
    onDeletePost(e, state) {
      const targetPost = state.posts.find(p => p.id == e.data.value);
      if (targetPost) {
        this.handles.get('posts').remove(targetPost);
      }
    }
    onBlurDescription(e, state) {
      this.updateSingleton('metadata',
          {blogOwner: this._props.user.id, description: e.data.value});
    }
    avatarToStyle(url) {
      return `background: url('${
          url}') center no-repeat; background-size: cover;`;
    }
    blogOwnerName(metadata) {
      const unknownName = 'Unknown';
      let name = unknownName;
      if (metadata) {
        name = this._state.people[metadata.blogOwner] || unknownName;
      }
      return name;
    }
    blogOwnerAvatarStyle(metadata, avatars) {
      const unknownAvatarUrl = '';
      let avatarUrl = unknownAvatarUrl;
      if (metadata) {
        avatarUrl = resolver(avatars[metadata.blogOwner]) || unknownAvatarUrl;
      }
      return this.avatarToStyle(avatarUrl);
    }
    blogDescription(user, metadata) {
      const blogDescription =
          (metadata && metadata.description) ? metadata.description : '';
      return {
        $template: (metadata && metadata.blogOwner == user.id) ?
            'blog-description-editable' :
            'blog-description-fixed',
        models: [{blogDescription}]
      };
    }
    sortPostsByDateAscending(posts) {
      return posts.sort((a, b) => {
        return b.createdTimestamp - a.createdTimestamp;
      });
    }
    clampSize(width, height) {
      if (!width || !height) {
        return {clampedWidth: width, clampedHeight: height};
      }
      const ratio = width / height;
      const maxWidth = 256;
      const clampedWidth = Math.min(maxWidth, width);
      const clampedHeight = clampedWidth / ratio;
      return {clampedWidth, clampedHeight};
    }
    postToModel(visible, {
      createdTimestamp,
      message,
      image,
      imageWidth,
      imageHeight,
      id,
      author
    }) {
      const {clampedWidth, clampedHeight} =
          this.clampSize(imageWidth, imageHeight);
      const when = new Date(createdTimestamp);
      const month = when.toLocaleDateString('en-US', {'month': 'short'});
      const day = when.toLocaleDateString('en-US', {'day': 'numeric'});
      return {
        message,
        image: image || '',
        imageWidth: clampedWidth,
        imageHeight: clampedHeight,
        id,
        month,
        day,
        style: {display: visible ? 'inline' : 'none'},
        avatarStyle: this.avatarToStyle(resolver(this._state.avatars[author])),
        owner: this._state.people[author]
      };
    }
    render({user, metadata}, {posts, avatars}) {
      const blogAuthor = this.blogOwnerName(metadata);
      const blogAvatarStyle = this.blogOwnerAvatarStyle(metadata, avatars);
      const blogDescription = this.blogDescription(user, metadata);
      // TODO(wkorman): We'll be splitting the aggregated feed into its own
      // particle soon, so the below flag is just an interim hack.
      const isAggregatedFeed = !metadata;
      const model =
          {isAggregatedFeed, blogAuthor, blogAvatarStyle, blogDescription};
      if (posts && posts.length > 0) {
        const sortedPosts = this.sortPostsByDateAscending(posts);
        const visible = this.handles.get('posts').canWrite;
        return Object.assign(model, {
          hideZeroState: true,
          posts: sortedPosts.map(p => this.postToModel(visible, p))
        });
      } else {
        return Object.assign(model, {hideZeroState: false, posts: []});
      }
    }
  };
});
