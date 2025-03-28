import {
  Container,
  ColumnLayout,
  Box,
  Header,
} from "@cloudscape-design/components";
import { Utils } from "../../../common/utils";

export interface WorkspacesStatistics {
  count: number;
  documents: number;
  vectors: number;
  sizeInBytes: number;
}

export interface GeneralConfigProps {
  statistics: WorkspacesStatistics | null;
}

export default function GeneralConfig(props: GeneralConfigProps) {
  return (
    <Container header={<Header variant="h2">סטטיסטיקה</Header>}>
      <ColumnLayout columns={4} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">סביבות עבודה</Box>
          <div style={{ padding: "0.8rem 0", fontSize: "2.5rem" }}>
            {!props.statistics ? "-" : props.statistics.count}
          </div>
        </div>
        <div>
          <Box variant="awsui-key-label">מסמכים</Box>
          <div style={{ padding: "0.8rem 0", fontSize: "2.5rem" }}>
            {!props.statistics ? "-" : props.statistics.documents}
          </div>
        </div>
        <div>
          <Box variant="awsui-key-label">וקטורים</Box>
          <div style={{ padding: "0.8rem 0", fontSize: "2.5rem" }}>
            {" "}
            {!props.statistics ? "-" : props.statistics.vectors}
          </div>
        </div>
        <div>
          <Box variant="awsui-key-label">נפח</Box>
          <div style={{ padding: "0.8rem 0", fontSize: "2.5rem" }}>
            {!props.statistics
              ? "-"
              : Utils.bytesToSize(props.statistics.sizeInBytes)}
          </div>
        </div>
      </ColumnLayout>
    </Container>
  );
}
