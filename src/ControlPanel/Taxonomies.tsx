import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import includes from 'lodash/includes';
import pull from 'lodash/pull';
import { Button, Checkbox } from '@plone/components';
import {
  Dialog,
  Modal,
  DialogTrigger,
  Heading,
  Separator,
} from 'react-aria-components';

import Helmet from '@plone/volto/helpers/Helmet/Helmet';
import { toast } from 'react-toastify';
import { defineMessages, useIntl, FormattedMessage } from 'react-intl';
import Icon from '@plone/volto/components/theme/Icon/Icon';
import Toolbar from '@plone/volto/components/manage/Toolbar/Toolbar';
import Toast from '@plone/volto/components/manage/Toast/Toast';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';

import backSVG from '@plone/volto/icons/back.svg';
import cicleAddSvg from '@plone/volto/icons/circle-plus.svg';
import deleteSVG from '@plone/volto/icons/delete.svg';

import AddTaxonomy from './AddTaxonomy';
import { deleteTaxonomy, listTaxonomies } from '@eeacms/volto-taxonomy/actions';
import { useClient } from '@plone/volto/hooks/client/useClient';

const messages = defineMessages({
  delete: {
    id: 'Taxonomies Deleted',
    defaultMessage: 'Taxonomies Deleted',
  },
  success: {
    id: 'Success',
    defaultMessage: 'Success',
  },
  error: {
    id: 'Error',
    defaultMessage: 'Error',
  },
  cancel: {
    id: 'Cancel',
    defaultMessage: 'Cancel',
  },
  confirm: {
    id: 'Confirm',
    defaultMessage: 'Confirm',
  },
});

const Taxonomies = (props) => {
  const intl = useIntl();
  const taxonomies = useSelector(
    (state) => state.taxonomy?.data?.items ?? state.taxonomy?.data,
  );
  const isClient = useClient();
  // const [taxonomies, setTaxonomies] = React.useState(taxonomyList);
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState([]);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    dispatch(listTaxonomies());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDeleteOk = () => {
    if (selected.length) {
      dispatch(deleteTaxonomy(selected))
        .then(() => {
          toast.success(
            <Toast
              success
              title={intl.formatMessage(messages.success)}
              content={intl.formatMessage(messages.delete)}
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
    }
    setSelected([]);
    setShowDelete(false);
  };

  const onDeleteCancel = () => {
    setShowDelete(false);
  };

  const onChangeSelect = (id) => {
    setSelected((prevState) =>
      !includes(selected, id)
        ? [...(prevState || []), id]
        : [...pull(prevState, id)],
    );
  };

  return (
    <div id="page-taxonomies" className="controlpanel-taxonomies ui container">
      <Helmet title="Taxonomies" />
      {show && <AddTaxonomy {...props} setShow={setShow} />}
      <div className="ui segments raised">
        <div className="ui segment primary">Taxonomy settings</div>
        <div className="ui segment">
          <h3>Existing taxonomies</h3>
        </div>
        <div className="ui segment">
          <table>
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="Select" defaultMessage="Select" />
                </th>
                <th>
                  <FormattedMessage id="Type" defaultMessage="Type" />
                </th>
                <th>
                  <FormattedMessage id="Count" defaultMessage="Count" />
                </th>
              </tr>
            </thead>
            <tbody>
              {taxonomies?.map(
                (item) =>
                  item && (
                    <tr key={item?.['name']}>
                      <td align="left">
                        <Checkbox
                          isSelected={selected?.includes(item?.['name'])}
                          onChange={() => onChangeSelect(item?.['name'])}
                          value={item?.['name']}
                        />
                      </td>
                      <td align="left">
                        <Link to={`${props.route.path}/${item?.['name']}`}>
                          {item?.title}
                        </Link>
                      </td>
                      <td align="right">
                        {item?.count?.[item.default_language]}
                      </td>
                    </tr>
                  ),
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isClient &&
        createPortal(
          <Toolbar
            pathname={props.location.pathname}
            hideDefaultViewButtons
            inner={
              <>
                <Link to="/controlpanel" className="item">
                  <Icon
                    name={backSVG}
                    aria-label="Back"
                    className="contents circled"
                    size="30px"
                    title="Back"
                  />
                </Link>
                <Button
                  id="add-taxonomy"
                  aria-label={'add-taxonomy'}
                  onClick={() => {
                    setShow(true);
                  }}
                >
                  <Icon
                    name={cicleAddSvg}
                    color="#007eb1"
                    aria-label="Add Taxonomy"
                    title={'Add Taxonomy'}
                    size="40px"
                  />
                </Button>
                <DialogTrigger>
                  <Button
                    id="delete-taxonomy"
                    aria-label={'delete-taxonomy'}
                    isDisabled={selected.length > 0 ? false : true}
                  >
                    <Icon
                      name={deleteSVG}
                      size="35px"
                      color={selected.length > 0 ? '#e40166' : 'grey'}
                      className="delete"
                    />
                  </Button>
                  <Modal isOpen={showDelete} onOpenChange={setShowDelete}>
                    <Dialog>
                      <Heading slot="title">
                        <FormattedMessage
                          id="delete-taxonomies-heading"
                          defaultMessage="Delete Taxonomies"
                        />
                      </Heading>
                      <FormattedMessage
                        id="Do you really want to delete the following taxonomies?"
                        defaultMessage="Do you really want to delete the following taxonomies?"
                      />
                      <Separator />
                      <Button onClick={onDeleteCancel}>
                        {intl.formatMessage(messages.cancel)}
                      </Button>
                      <Button onClick={onDeleteOk}>
                        {intl.formatMessage(messages.confirm)}
                      </Button>
                    </Dialog>
                  </Modal>
                </DialogTrigger>
              </>
            }
          />,
          document.getElementById('toolbar'),
        )}
    </div>
  );
};

export default Taxonomies;
