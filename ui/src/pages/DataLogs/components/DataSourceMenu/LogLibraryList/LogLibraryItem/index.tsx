import classNames from "classnames";
import logLibraryListStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/index.less";
import { message, Tooltip } from "antd";
import { FileTextOutlined, FundViewOutlined } from "@ant-design/icons";
import IconFont from "@/components/IconFont";
import {
  FIFTEEN_TIME,
  FIRST_PAGE,
  MINUTES_UNIT_TIME,
  PAGE_SIZE,
} from "@/config/config";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import lodash from "lodash";
import moment from "moment";
import { currentTimeStamp } from "@/utils/momentUtils";
import { useState } from "react";
import DeletedModal from "@/components/DeletedModal";
import { TablesResponse } from "@/services/dataLogs";
import useTimeOptions from "@/pages/DataLogs/hooks/useTimeOptions";
import { DefaultPane, PaneType } from "@/models/datalogs/useLogPanes";
import { RestUrlStates } from "@/pages/DataLogs/hooks/useLogUrlParams";
import useUrlState from "@ahooksjs/use-url-state";

type LogLibraryItemProps = {
  logLibrary: TablesResponse;
  onChange: (logLibrary: TablesResponse) => void;
};

const LogLibraryItem = (props: LogLibraryItemProps) => {
  const { onChange, logLibrary } = props;
  const [, setUrlState] = useUrlState();
  const {
    doGetLogLibraryList,
    doDeletedLogLibrary,
    onChangeLogLibrary,
    currentLogLibrary,
    currentDatabase,
    logPanesHelper,
    resetCurrentHighChart,
    onChangeLogLibraryInfoDrawVisible,
    doGetLogsAndHighCharts,
    onChangeLogPane,
    onChangeCurrentLogPane,
    onChangeViewsVisibleDraw,
    resetLogs,
  } = useModel("dataLogs");
  const { logPanes, paneKeys, addLogPane, removeLogPane } = logPanesHelper;

  const [mouseEnter, setMouseEnter] = useState<boolean>(false);

  const i18n = useIntl();
  const { handleChangeRelativeAmountAndUnit } = useTimeOptions();

  const onChangePanes = () => {
    const currentPanes = lodash.cloneDeep(logPanes);
    const paneId = logLibrary.id.toString();
    const tabPane = currentPanes[paneId];
    if (!tabPane) {
      const pane: PaneType = {
        ...DefaultPane,
        pane: logLibrary.tableName,
        paneId,
        paneType: logLibrary.createType,
      };
      addLogPane(paneId, pane);
      onChangeCurrentLogPane(pane);
      doGetLogsAndHighCharts(logLibrary.id, {
        st: moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME).unix(),
        et: currentTimeStamp(),
        page: FIRST_PAGE,
        pageSize: PAGE_SIZE,
        kw: "",
      }).then((res) => {
        if (!res) return;
        pane.logs = res.logs;
        pane.highCharts = res.highCharts;
        onChangeLogPane(pane);
      });
    } else {
      onChangeLogPane(tabPane);
      handleChangeRelativeAmountAndUnit(tabPane);
    }
  };

  const doDeleted = () => {
    if (!currentDatabase) return;
    const hideMessage = message.loading(
      {
        content: i18n.formatMessage(
          {
            id: "datasource.logLibrary.deleted.loading",
          },
          { logLibrary: logLibrary.tableName }
        ),
        key: "deletedTable",
      },
      0
    );
    doDeletedLogLibrary
      .run(logLibrary.id)
      .then((res) => {
        if (res?.code === 0) {
          const currentKey = logLibrary.id.toString();
          // 判断日志库是否打开
          message.success(
            {
              content: i18n.formatMessage({
                id: "datasource.logLibrary.deleted.success",
              }),
              key: "deletedTable",
            },
            3
          );
          doGetLogLibraryList();
          // 不在打开的日志库中
          if (!paneKeys.includes(currentKey)) return;

          // 日志库打开，当前选中日志库是需要删除的日志库
          const resultKeys = paneKeys.filter((key) => key !== currentKey);
          const len = resultKeys.length;
          // 删除日志库
          removeLogPane(currentKey);

          // 只打开了当前日志库
          if (len === 0) {
            resetLogs();
            onChangeLogLibrary(undefined);
            setUrlState(RestUrlStates);
          }
          // 如果还有其他日志库，则切换到第一条
          if (len > 0 && parseInt(currentKey) === currentLogLibrary?.id) {
            const currentPanes = lodash.cloneDeep(logPanes);
            const currentPane = currentPanes[resultKeys[0]];
            delete currentPanes[currentKey];
            handleChangeRelativeAmountAndUnit(currentPane);
            onChangeCurrentLogPane(currentPane, currentPanes);
            onChangeLogLibrary({
              id: parseInt(currentPane.paneId),
              tableName: currentPane.pane,
              createType: currentPane.paneType,
            });
          }
        } else hideMessage();
      })
      .catch(() => hideMessage());
  };
  return (
    <li
      className={classNames(
        currentLogLibrary?.id === logLibrary.id &&
          logLibraryListStyles.activeLogLibrary,
        mouseEnter && logLibraryListStyles.LogLibraryHover
      )}
    >
      <Tooltip title={logLibrary.tableName}>
        <span
          onClick={() => {
            if (currentLogLibrary?.id === logLibrary.id) return;
            onChangeLogLibrary(logLibrary);
            resetCurrentHighChart();
            onChangePanes();
          }}
          onMouseEnter={() => setMouseEnter(true)}
          onMouseLeave={() => setMouseEnter(false)}
          className={classNames(logLibraryListStyles.title)}
        >
          {logLibrary.tableName}
        </span>
      </Tooltip>

      <Tooltip
        title={i18n.formatMessage({
          id: "datasource.tooltip.icon.info",
        })}
      >
        <FileTextOutlined
          onClick={() => {
            onChange(logLibrary);
            onChangeLogLibraryInfoDrawVisible(true);
          }}
          className={classNames(logLibraryListStyles.icon)}
        />
      </Tooltip>

      {logLibrary.createType === 0 && (
        <Tooltip
          title={i18n.formatMessage({
            id: "datasource.tooltip.icon.view",
          })}
        >
          <FundViewOutlined
            onClick={() => {
              onChange(logLibrary);
              onChangeViewsVisibleDraw(true);
            }}
            className={classNames(logLibraryListStyles.icon)}
          />
        </Tooltip>
      )}
      <Tooltip
        title={i18n.formatMessage({
          id: "datasource.tooltip.icon.deleted",
        })}
      >
        <IconFont
          onClick={() => {
            DeletedModal({
              onOk: () => {
                doDeleted();
              },
              content: i18n.formatMessage(
                {
                  id: "datasource.logLibrary.deleted.content",
                },
                { logLibrary: logLibrary.tableName }
              ),
            });
          }}
          className={classNames(logLibraryListStyles.icon)}
          type={
            currentLogLibrary?.id === logLibrary.id
              ? "icon-log-delete"
              : "icon-delete"
          }
        />
      </Tooltip>
    </li>
  );
};

export default LogLibraryItem;
