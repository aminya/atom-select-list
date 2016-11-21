/** @babel */
/** @jsx etch.dom */

const {CompositeDisposable, TextEditor} = require('atom')
const etch = require('etch')
const fuzzaldrin = require('fuzzaldrin')
const path = require('path')

module.exports = class SelectListView {
  constructor (props) {
    this.selectionIndex = 0
    this.props = props
    this.computeItems()
    this.disposables = new CompositeDisposable()
    this.editorDisposables = new CompositeDisposable()
    etch.initialize(this)
    this.queryEditor = this.refs.queryEditor
    if (this.queryEditor) {
      this.editorDisposables.add(this.queryEditor.onDidChange(this.didChangeQuery.bind(this)))
    }
    this.disposables.add(this.registerAtomCommands())
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
  }

  destroy () {
    this.disposables.dispose()
    this.editorDisposables.dispose()
    etch.destroy(this)
  }

  registerAtomCommands () {
    return global.atom.commands.add(this.element, {
      'core:move-up': (event) => {
        this.selectPrevious()
        event.stopPropagation()
      },
      'core:move-down': (event) => {
        this.selectNext()
        event.stopPropagation()
      },
      'core:move-to-top': (event) => {
        this.selectFirst()
        event.stopPropagation()
      },
      'core:move-to-bottom': (event) => {
        this.selectLast()
        event.stopPropagation()
      },
      'core:confirm': (event) => {
        this.confirmSelection()
        event.stopPropagation()
      },
      'core:cancel': (event) => {
        etch.destroy(this)
        event.stopPropagation()
      }
    })
  }

  async update (props = {}) {
    if (props.items) {
      this.props.items = props.items
      this.computeItems()
    }

    await etch.update(this)

    if (this.refs.queryEditor && !this.queryEditor) {
      this.queryEditor = this.refs.queryEditor
      this.editorDisposables.add(this.queryEditor.onDidChange(this.didChangeQuery.bind(this)))
    } else if (!this.refs.queryEditor && this.queryEditor) {
      this.queryEditor = null
      this.editorDisposables.dispose()
      this.editorDisposables = new CompositeDisposable()
    }
  }

  render () {
    if (this.items.length > 0) {
      return (
        <div>
          <TextEditor ref='queryEditor' mini={true} />
          <ul ref='items'>{this.items.map((item) =>
            <ListItemView
              item={this.props.viewForItem(item)}
              selected={this.getSelectedItem() === item} />
          )}</ul>
        </div>
      )
    } else {
      return (
        <div>
          <span ref="emptyMessage">{this.props.emptyMessage}</span>
        </div>
      )
    }
  }

  getQuery () {
    if (this.refs && this.refs.queryEditor) {
      return this.refs.queryEditor.getText()
    } else {
      return ""
    }
  }

  didChangeQuery () {
    this.computeItems()
    this.selectionIndex = 0
    etch.update(this)
  }

  computeItems () {
    const filterFn = this.props.filter || this.fuzzyFilter.bind(this)
    this.items = filterFn(this.props.items, this.getQuery()).slice(0, this.props.maxResults || Infinity)
  }

  fuzzyFilter (items, query) {
    if (query.length === 0) {
      return items
    } else {
      const scoredItems = []
      for (const item of items) {
        const string = this.props.filterKeyForItem ? this.props.filterKeyForItem(item) : item
        let score = fuzzaldrin.score(string, query)
        if (score > 0) {
          scoredItems.push({item, score})
        }
      }
      scoredItems.sort((a, b) => b.score - a.score)
      return scoredItems.map((i) => i.item)
    }
  }

  getSelectedItem () {
    return this.items[this.selectionIndex]
  }

  selectPrevious () {
    this.selectionIndex = this.selectionIndex === 0 ? this.items.length - 1 : this.selectionIndex - 1
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    return this.update()
  }

  selectNext () {
    this.selectionIndex = this.selectionIndex === this.items.length - 1 ? 0 : this.selectionIndex + 1
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    return this.update()
  }

  selectFirst () {
    this.selectionIndex = 0
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    return this.update()
  }

  selectLast () {
    this.selectionIndex = this.items.length - 1
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    return etch.update(this)
  }

  confirmSelection () {
    if (this.props.didConfirmSelection) {
      this.props.didConfirmSelection(this.getSelectedItem())
    }
    return etch.destroy(this)
  }
}

class ListItemView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  render () {
    const className = this.props.selected ? 'selected' : ''
    return <li className={className}>{this.props.item}</li>
  }

  writeAfterUpdate () {
    if (this.props.selected) {
      this.element.scrollIntoViewIfNeeded()
    }
  }
}