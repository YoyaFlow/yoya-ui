import { describe, expect, it, vi } from 'vitest';
import {
  ElementNode,
  VTextNode,
  ViewNode,
  button,
  div,
  h1,
  input,
  p,
  vText
} from '../index.js';

describe('ViewNode core', () => {
  it('creates element and text nodes through HTML factories', () => {
    const root = div((page) => {
      page.h1('Dashboard');
      page.p('Ready');
    });

    expect(root).toBeInstanceOf(ElementNode);
    expect(root).toBeInstanceOf(ViewNode);
    expect(root.children()).toHaveLength(2);
    expect(root.children()[0].tagName()).toBe('h1');
    expect(root.children()[1].textContent()).toBe('Ready');
    expect(vText('copy')).toBeInstanceOf(VTextNode);

    const title = h1('Title');
    expect(title.children()[0]).toBeInstanceOf(VTextNode);
    expect(title.textContent()).toBe('Title');
    expect(title.renderDom().textContent).toBe('Title');
  });

  it('supports string, function, and object setup values', () => {
    const action = vi.fn();
    const root = div({
      id: 'panel',
      className: ['surface', 'active'],
      style: { color: 'red' },
      onclick: action,
      children: [
        h1('Users'),
        p((paragraph) => paragraph.text('Created from function setup'))
      ]
    });

    const element = root.renderDom();
    element.click();

    expect(element.id).toBe('panel');
    expect(element.classList.contains('surface')).toBe(true);
    expect(element.classList.contains('active')).toBe(true);
    expect(element.style.color).toBe('red');
    expect(element.textContent).toContain('Users');
    expect(element.textContent).toContain('Created from function setup');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('chains attrs, classes, styles, events, and children', () => {
    const onClick = vi.fn();
    const root = div()
      .id('root')
      .attr('role', 'region')
      .className('layout primary')
      .style('display', 'grid')
      .on('click', onClick)
      .child(button('Save').attr('type', 'button'));

    const element = root.renderDom();
    element.click();

    expect(root.attr('role')).toBe('region');
    expect(element.id).toBe('root');
    expect(element.className).toBe('layout primary');
    expect(element.style.display).toBe('grid');
    expect(element.querySelector('button').textContent).toBe('Save');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('binds to a target and destroys DOM and event listeners', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const onClick = vi.fn();
    const root = div('Mounted').on('click', onClick).bindTo('#app');
    const element = document.querySelector('#app > div');

    element.click();
    root.destroy();
    element.click();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(document.querySelector('#app > div')).toBeNull();
    expect(root.renderDom()).toBeNull();
  });

  it('serializes the view tree to HTML', () => {
    const root = div((page) => {
      page.id('profile').className('card');
      page.h1('Profile');
      page.input((field) => {
        field.name('email').attr('value', 'ada@example.com');
      });
    });

    expect(root.toHTML()).toBe(
      '<div id="profile" class="card"><h1>Profile</h1><input name="email" value="ada@example.com"></div>'
    );
  });

  it('runs state handlers and exposes typed state reads', () => {
    const field = input()
      .registerStateAttrs('disabled', { size: 'string' })
      .registerStateHandler('disabled', (enabled, node) => {
        node.attr('disabled', enabled ? true : null);
      })
      .registerStateHandler('size', (size, node) => {
        node.attr('data-size', size);
      });

    field.setState('disabled', true).setState('size', 'large');

    expect(field.getBooleanState('disabled')).toBe(true);
    expect(field.getStringState('size')).toBe('large');
    expect(field.renderDom().hasAttribute('disabled')).toBe(true);
    expect(field.renderDom().getAttribute('data-size')).toBe('large');
  });
});
