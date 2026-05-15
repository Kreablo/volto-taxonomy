import {
  useState,
  useCallback,
  useEffect,
  Key,
  useRef,
  MouseEvent,
} from 'react';
import Helmet from '@plone/volto/helpers/Helmet/Helmet';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuid } from 'uuid';
import Icon from '@plone/volto/components/theme/Icon/Icon';
import Toolbar from '@plone/volto/components/manage/Toolbar/Toolbar';
import Toast from '@plone/volto/components/manage/Toast/Toast';
import Field from '@plone/volto/components/manage/Form/Field';
import config from '@plone/volto/registry';
import { defineMessages, useIntl } from 'react-intl';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import backSVG from '@plone/volto/icons/back.svg';
import deleteSVG from '@plone/volto/icons/delete.svg';
import addDocumentSVG from '@plone/volto/icons/add-document.svg';
import addSVG from '@plone/volto/icons/add.svg';
import saveSVG from '@plone/volto/icons/save.svg';
import navSVG from '@plone/volto/icons/nav.svg';
import dragSVG from '@plone/volto/icons/drag.svg';
import { getTaxonomy, updateTaxonomy } from '@eeacms/volto-taxonomy/actions';
import TaxonomySettings from './TaxonomySettings';
import {
  Collection,
  Input,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tree,
  TreeItem,
  TreeItemContent,
  TreeData,
  useDragAndDrop,
} from 'react-aria-components';
import { useTreeData } from 'react-stately';
import { Button, Tabs } from '@plone/components';
import { useClient } from '@plone/volto/hooks/client/useClient';
import { ChevronRight } from 'lucide-react';
import './style.less';

const messages = defineMessages({
  saved: {
    id: 'Changes saved',
    defaultMessage: 'Changes saved',
  },
  success: {
    id: 'Success',
    defaultMessage: 'Success',
  },
  error: {
    id: 'Error',
    defaultMessage: 'Error',
  },
  duplicatedIds: {
    id: 'Duplicated Ids',
    description: 'Duplicated Id warning message.',
    defaultMessage: 'Duplicated Ids present',
  },
  duplicatedIdContent: {
    id: 'duplicatedIdContent',
    description: 'Duplicated Id warning message.',
    defaultMessage:
      'Duplicated Ids present, use unique ids in order to ' +
      'save these changes.',
  },
  PleaseAddTaxonomy: {
    id: 'Please add a new taxonomy entry',
    defaultMessage: 'Please add a new taxonomy entry',
  },
  addSameLevel: {
    id: 'Add node at same level',
    defaultMessage: 'Add node at same level',
  },
  addChildNode: {
    id: 'Add child node',
    defaultMessage: 'Add child node',
  },
  deleteNode: {
    id: 'Delete node',
    defaultMessage: 'Delete node',
  },
  editTaxonomyData: {
    id: 'edit-taxonomy-data',
    defaultMessage: 'Edit Taxonomy Data',
  },
  editTaxonomy: {
    id: 'edit-taxonomy',
    defaultMessage: 'Edit Taxonomy',
  },
  taxonomies: {
    id: 'edit-taxonomy-taxonomies',
    defaultMessage: 'Taxonomies',
  },
  textPlaceholder: {
    id: 'edit-taxonomy-text-placeholder',
    defaultMessage: 'Translatable text',
  },
  keyPlaceholder: {
    id: 'edit-taxonomy-key-placeholder',
    defaultMessage: 'Key',
  },
  taxonomyHeading: {
    id: 'edit-taxonomy-heading',
    defaultMessage: 'Taxonomy: {taxonomy}',
  },
  language: {
    id: 'edit-taxonomy-language',
    defaultMessage: 'Language',
  },
});

function useCellEditMode() {
  const isFocusedRef = useRef(false);
  const isEditModeRef = useRef(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isFocusedRef.current) {
        if (e.code === 'Enter') {
          isEditModeRef.current = true;
        } else if (e.code === 'Escape' || e.code === 'Tab') {
          isEditModeRef.current = false;
        }
        if (isEditModeRef.current) {
          e.stopPropagation();
        }
      }
    };
    // capture all events on 'window' because we are in the capture phase
    window.addEventListener('keydown', handler, true);
    return () => {
      window.removeEventListener('keydown', handler, true);
    };
  }, []);

  const setFocus = (should: boolean) => (isFocusedRef.current = should);

  const preventProps = {
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    onClick: (e: MouseEvent<HTMLInputElement, MouseEvent>) => {
      // We did not focus through keyboard nav, so we can
      // enter the edit mode right away.
      isEditModeRef.current = true;
      e.stopPropagation();
    },
  };
  return preventProps;
}

export function checkForDuplicates(flatdata = []) {
  const nodes = flatdata.map((item) => item.node.key);
  return new Set(nodes).size !== nodes.length;
}

type TreeNode<T> = {
  key: Key;
  value: T;
  children: TreeNode<T>[];
};

type TaxonomyItem = {
  key: string;
  title: string;
  value: {
    translations: Record<string, string>;
  };
  children?: TaxonomyItem[];
};

type Taxonomy = {
  default_language: string;
};

type TaxonomyItemElemProps = {
  item: TreeNode<TaxonomyItem>;
  expandedKeys: Set<Key>;
  setExpandedKeys: (keys: Set<Key>) => void;
  languageToShow: string;
  tree: TreeData<TaxonomyItem>;
  renderItem: (item: TreeNode<TaxonomyItem>) => JSX.Element;
  taxonomy: Taxonomy;
  prevent: {
    onFocus: () => void;
    onBlur: () => void;
    onClick: (e: MouseEvent) => void;
  };
};

const _newItem: (languageToShow: string) => TaxonomyItem = (
  languageToShow,
) => ({
  title: '',
  key: uuid(),
  value: {
    translations: {
      [languageToShow]: '',
    },
  },
});

const TaxonomyItemElem: (props: TaxonomyItemElemProps) => JSX.Element = ({
  item,
  tree,
  expandedKeys,
  setExpandedKeys,
  languageToShow,
  renderItem,
  prevent,
  taxonomy,
}) => {
  const intl = useIntl();
  const toggle = useCallback(() => {
    const newexp = new Set(expandedKeys);
    if (expandedKeys.has(item.key)) {
      newexp.delete(item.key);
    } else {
      newexp.add(item.key);
    }
    setExpandedKeys(newexp);
  }, [expandedKeys, setExpandedKeys, item.key]);
  const expand = useCallback(() => {
    if (!expandedKeys.has(item.key)) {
      const newexp = new Set(expandedKeys);
      newexp.add(item.key);
      setExpandedKeys(newexp);
    }
  }, [expandedKeys, setExpandedKeys, item.key]);
  const translation = item.value.translations?.[languageToShow];
  const title = translation !== undefined ? translation : '';
  return (
    <TreeItem id={item.key} textValue={title} onPress={toggle}>
      <TreeItemContent>
        {item.children && item.children.length > 0 && (
          <Button slot="chevron" className="chevron" onPress={toggle}>
            <ChevronRight size={16} />
          </Button>
        )}
        <span className="taxonomy-item-edit">
          <Button slot="drag">
            <Icon size="24px" className="drag" name={dragSVG} />
          </Button>
          <Input
            {...prevent}
            type="text"
            defaultValue={title}
            className="react-aria-Input taxonomy-text"
            placeholder={intl.formatMessage(messages.textPlaceholder)}
            onBlur={(e) => {
              prevent.onBlur();
              if (translation !== e.target.value) {
                const v = {
                  ...item.value,
                  translations: {
                    ...(item.value.translations ? item.value.translations : {}),
                    [languageToShow]: e.target.value,
                  },
                };
                if (languageToShow === taxonomy.default_language) {
                  v.title = e.target.value;
                }
                tree.update(item.key, v);
              }
            }}
          />
          <Input
            {...prevent}
            type="text"
            defaultValue={String(item.key)}
            className="react-aria-Input taxonomy-key"
            placeholder={intl.formatMessage(messages.keyPlaceholder)}
            onBlur={(e) => {
              prevent.onBlur();
              if (item.key !== e.target.value) {
                if (tree.getItem(e.target.value) !== undefined) {
                  toast.error(
                    <Toast
                      error
                      title={intl.formatMessage(messages.duplicatedIds)}
                      content={intl.formatMessage(messages.duplicatedIdContent)}
                    />,
                  );
                  e.target.focus();
                  return;
                }
                const parentKey = tree.getItem(item.key).parentKey;
                const siblings =
                  parentKey !== null
                    ? tree.getItem(parentKey).children
                    : tree.items;
                const index = siblings.findIndex(
                  (item0) => item0.key === item.key,
                );
                const v = {
                  ...item.value,
                  key: e.target.value,
                };
                tree.remove(item.key);
                tree.insert(parentKey, index, v);
              }
            }}
          />
          <Button
            onClick={() => {
              expand();
              tree.append(item.key, _newItem(languageToShow));
            }}
          >
            <Icon
              name={navSVG}
              size="24px"
              title={intl.formatMessage(messages.addChildNode)}
            />
          </Button>
          <Button onClick={() => tree.remove(item.key)}>
            <Icon
              name={deleteSVG}
              size="24px"
              className="delete"
              title={intl.formatMessage(messages.deleteNode)}
            />
          </Button>
          <Button
            onClick={() => tree.insertAfter(item.key, _newItem(languageToShow))}
          >
            <Icon
              name={addDocumentSVG}
              size="24px"
              title={intl.formatMessage(messages.addSameLevel)}
            />
          </Button>
        </span>
      </TreeItemContent>
      {item.children && (
        <Collection
          items={item.children}
          dependencies={[languageToShow, expandedKeys, tree]}
        >
          {(child) => renderItem(child)}
        </Collection>
      )}
    </TreeItem>
  );
};

const EditTaxonomy = (props) => {
  const { id } = props.match.params;
  const dispatch = useDispatch();
  const intl = useIntl();
  const tree = useTreeData<TaxonomyItem>({
    getKey: (item) => item.key,
    getChildren: (item) => item.children,
  });
  const [expandedKeys, setExpandedKeys] = useState(new Set<Key>());
  const taxonomy = useSelector((state) => state.taxonomy);
  const request: Taxonomy = taxonomy?.taxonomy;
  const prevent = useCellEditMode();
  let { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys, items: typeof tree.items) =>
      Array.from(keys).map((key) => ({
        'text/plain': String(key),
      })),
    getAllowedDropOperations: () => ['move'],
    onMove(e) {
      if (e.target.dropPosition === 'before') {
        tree.moveBefore(e.target.key, e.keys);
      } else if (e.target.dropPosition === 'after') {
        tree.moveAfter(e.target.key, e.keys);
      } else if (e.target.dropPosition === 'on') {
        // Move items to become children of the target
        let targetNode = tree.getItem(e.target.key);
        if (targetNode) {
          let targetIndex = targetNode.children
            ? targetNode.children.length
            : 0;
          let keyArray = Array.from(e.keys);
          for (let i = 0; i < keyArray.length; i++) {
            tree.move(keyArray[i], e.target.key, targetIndex + i);
          }
        }
      }
    },
  });
  const isClient: boolean = useClient();

  const [languageToShow, setLanguage] = useState(null);

  const defaultLanguage = config.settings.languages.find(
    (lang) => lang.code === request?.default_language,
  );

  useEffect(() => {
    dispatch(getTaxonomy(id)).then((taxonomy) => {
      if (taxonomy?.tree) {
        tree.append(null, ...taxonomy?.tree);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dispatch]);

  useEffect(() => {
    setLanguage(defaultLanguage?.code);
  }, [defaultLanguage]);

  const handleLanguageChange = useCallback((_: any, value: string) => {
    setLanguage(value);
  }, []);

  const onSubmit = useCallback(() => {
    const languages = languageToShow
      ? [languageToShow]
      : [request?.default_language];
    dispatch(
      updateTaxonomy(id, {
        taxonomy: request?.name,
        title: request?.title,
        languages,
        tree: tree.items.map(function extract(item) {
          return {
            ...item.value,
            children: item.children.map(extract),
          };
        }),
      }),
    )
      .then(() => {
        toast.success(
          <Toast
            success
            title={intl.formatMessage(messages.success)}
            content={intl.formatMessage(messages.saved)}
          />,
        );
      })
      .catch((e) => {
        toast.error(
          <Toast
            error
            title={intl.formatMessage(messages.error)}
            content={e.message}
          />,
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, dispatch, request, languageToShow, id, intl]);

  return (
    <div id="page-taxonomies" className="ui container controlpanel-taxonomies">
      <Helmet title="Taxonomies" />
      <div className="ui segments raised">
        <div className="ui segment primary">
          <h3>
            {intl.formatMessage(messages.taxonomyHeading, {
              taxonomy: request?.title || 'loading...',
            })}
          </h3>
        </div>

        <div className="ui segment">
          <Tabs>
            <TabList>
              <Tab id="edit-taxonomy-data">
                {intl.formatMessage(messages.editTaxonomyData)}
              </Tab>
              <Tab id="edit-taxonomy">
                {intl.formatMessage(messages.editTaxonomy)}
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel id="edit-taxonomy-data">
                <Field
                  id="language"
                  title={intl.formatMessage(messages.language)}
                  default={defaultLanguage?.code}
                  widget="select"
                  type="string"
                  vocabulary={{
                    '@id': 'plone.app.vocabularies.SupportedContentLanguages',
                  }}
                  value={languageToShow}
                  onChange={handleLanguageChange}
                />
                <div className="taxonomy-tree-wrapper">
                  <Tree
                    aria-label={intl.formatMessage(messages.taxonomies)}
                    selectionMode="none"
                    dragAndDropHooks={dragAndDropHooks}
                    dependencies={[languageToShow, expandedKeys]}
                    key={languageToShow}
                    expandedKeys={expandedKeys}
                    renderEmptyState={() => (
                      <div className="add-taxonomy placeholder">
                        <Button
                          onClick={() =>
                            tree.append(null, _newItem(languageToShow))
                          }
                        >
                          <Icon name={addSVG} size="24px" />
                        </Button>
                        <p>{intl.formatMessage(messages.PleaseAddTaxonomy)}</p>
                      </div>
                    )}
                  >
                    <Collection items={tree.items}>
                      {function renderItem(item: TreeNode<TaxonomyItem>) {
                        return (
                          <TaxonomyItemElem
                            item={item}
                            setExpandedKeys={setExpandedKeys}
                            expandedKeys={expandedKeys}
                            renderItem={renderItem}
                            tree={tree}
                            languageToShow={languageToShow}
                            prevent={prevent}
                            taxonomy={request}
                          />
                        );
                      }}
                    </Collection>
                  </Tree>
                </div>
              </TabPanel>
              <TabPanel id="edit-taxonomy">
                <TaxonomySettings {...props} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>

        {isClient &&
          createPortal(
            <Toolbar
              pathname={props.location.pathname}
              hideDefaultViewButtons
              inner={
                <>
                  <Link to="/controlpanel/taxonomies" className="item">
                    <Icon
                      name={backSVG}
                      aria-label="Back"
                      className="contents circled"
                      size="30px"
                      title="Back"
                    />
                  </Link>
                  <Button
                    id="save-taxonomy-data"
                    aria-label={'Save taxonomy'}
                    className="save"
                    onClick={onSubmit}
                  >
                    <Icon
                      name={saveSVG}
                      className="circled"
                      color="#007eb1"
                      aria-label="Save Taxonomy"
                      title={'Save Taxonomy'}
                      size="30px"
                    />
                  </Button>
                </>
              }
            />,
            document.getElementById('toolbar'),
          )}
      </div>
    </div>
  );
};

export default EditTaxonomy;
