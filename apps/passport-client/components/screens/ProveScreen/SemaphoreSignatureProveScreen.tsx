import { PCDGetRequest, ProveRequest } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage,
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { cloneDeep } from "lodash";
import * as React from "react";
import { ReactNode, useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { requestPendingPCD } from "../../../src/api/requestPendingPCD";
import { DispatchContext } from "../../../src/dispatch";
import { Button, Spacer } from "../../core";

export function SemaphoreSignatureProveScreen({
  req,
}: {
  req: PCDGetRequest<typeof SemaphoreSignaturePCDPackage>;
}) {
  // Create a zero-knowledge proof using the identity in DispatchContext
  const [state] = useContext(DispatchContext);
  const [proving, setProving] = useState(false);
  const onProve = useCallback(async () => {
    try {
      setProving(true);
      const modifiedArgs = cloneDeep(req.args);
      const args = await fillArgs(
        state.identity,
        state.self.uuid,
        modifiedArgs
      );

      if (req.options?.proveOnServer === true) {
        const serverReq: ProveRequest = {
          pcdType: SemaphoreSignaturePCDPackage.name,
          args: args,
        };
        const pendingPCD = await requestPendingPCD(serverReq);
        window.location.href = `${
          req.returnUrl
        }?encodedPendingPCD=${JSON.stringify(pendingPCD)}`;
      } else {
        const { prove, serialize } = SemaphoreSignaturePCDPackage;
        const pcd = await prove(args);
        const serializedPCD = await serialize(pcd);
        window.location.href = `${req.returnUrl}?proof=${JSON.stringify(
          serializedPCD
        )}`;
      }
    } catch (e) {
      console.log(e);
    }
  }, [req, state.identity, state.self?.uuid]);

  const lines: ReactNode[] = [];

  if (req.args.signedMessage.value === undefined) {
    lines.push(
      <div>
        Revealing your Zuzalu Identity
        <Spacer h={16} />
        <p>
          Make sure you trust this website. You are revealing your name and
          email as well as your public key.
        </p>
      </div>
    );
  } else {
    lines.push(
      <p>
        Signing message: <b>{req.args.signedMessage.value}</b>
      </p>
    );
  }

  lines.push(<Button onClick={onProve}>Prove</Button>);

  if (proving) {
    lines.push(<p>Proving...</p>);
  }

  return (
    <div>
      {lines.map((line, i) => (
        <LineWrap key={i}>{line}</LineWrap>
      ))}
    </div>
  );
}

async function fillArgs(
  identity: Identity,
  uuid: string,
  modifiedArgs: SemaphoreSignaturePCDArgs
): Promise<SemaphoreSignaturePCDArgs> {
  const signedMessage = modifiedArgs.signedMessage;

  if (signedMessage.value === undefined) {
    console.log("undefined message to sign, setting it to", uuid);
    signedMessage.value = uuid;
  }

  const args: SemaphoreSignaturePCDArgs = {
    signedMessage,
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({ identity })
      ),
    },
  };

  return args;
}

const LineWrap = styled.div`
  margin-bottom: 16px;
`;
